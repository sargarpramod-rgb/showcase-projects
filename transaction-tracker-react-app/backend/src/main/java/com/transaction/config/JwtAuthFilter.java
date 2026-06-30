package com.transaction.config;

import com.transaction.security.JwtService;
import com.transaction.security.CookieService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Map;

@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final CookieService cookieService;

    public JwtAuthFilter(JwtService jwtService, CookieService cookieService) {
        this.jwtService = jwtService;
        this.cookieService = cookieService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {

        // Read tokens from HttpOnly cookies — not headers
        String accessToken  = cookieService.getAccessToken(request);
        String refreshToken = cookieService.getRefreshToken(request);

        if (accessToken == null) {
            filterChain.doFilter(request, response);
            return;
        }

        // ── Case 1: Access token valid ────────────────────────────────────────
        if (jwtService.isTokenValid(accessToken)) {
            setAuthentication(accessToken);
            filterChain.doFilter(request, response);
            return;
        }

        // ── Case 2: Access token expired — auto rotate ────────────────────────
        if (jwtService.isTokenExpiredOnly(accessToken) && refreshToken != null) {
            try {
                Map<String, String> newTokens = jwtService.rotateTokens(refreshToken);

                // Set new tokens as HttpOnly cookies transparently
                cookieService.setAccessTokenCookie(
                    response,
                    newTokens.get("accessToken"),
                    15 * 60           // 15 minutes
                );
                cookieService.setRefreshTokenCookie(
                    response,
                    newTokens.get("refreshToken"),
                    7 * 24 * 60 * 60  // 7 days
                );

                setAuthentication(newTokens.get("accessToken"));
                filterChain.doFilter(request, response); // request continues!
                return;

            } catch (Exception e) {
                // Refresh token expired or blacklisted — force re-login
                cookieService.clearTokenCookies(response);
                SecurityContextHolder.clearContext();
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                response.getWriter().write("Session expired. Please log in again.");
                return;
            }
        }

        // ── Case 3: Token invalid ─────────────────────────────────────────────
        cookieService.clearTokenCookies(response);
        SecurityContextHolder.clearContext();
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.getWriter().write("Invalid token.");
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getServletPath();
        return path.startsWith("/auth/"); // don't run JWT filter on auth endpoints
    }

    private void setAuthentication(String token) {
        Authentication auth = jwtService.getAuthentication(token);
        SecurityContextHolder.getContext().setAuthentication(auth);
    }
}