package com.transaction.config;

import com.transaction.security.AuthSessionService;
import com.transaction.security.CookieService;
import com.transaction.security.JwtService;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataAccessException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.TransactionException;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Map;

@RequiredArgsConstructor
public class JwtAuthFilter extends OncePerRequestFilter {
    private final JwtService jwt;
    private final CookieService cookies;
    private final AuthSessionService sessions;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String access = cookies.getAccessToken(request);
        String refresh = cookies.getRefreshToken(request);
        if (access == null && refresh == null) {
            filterChain.doFilter(request, response);
            return;
        }

        try {
            if (refresh != null && (access == null || jwt.isExpiredAccessToken(access))) {
                Map<String, String> tokens = sessions.rotate(refresh);
                access = tokens.get("accessToken");
                // The transaction has committed before any new cookies are sent.
                cookies.setAccessTokenCookie(response, access, jwt.getAccessTokenCookieMaxAgeSeconds());
                cookies.setRefreshTokenCookie(response, tokens.get("refreshToken"),
                        jwt.getRefreshTokenCookieMaxAgeSeconds());
            }
            if (access == null) throw new IllegalArgumentException("Missing access token");
            SecurityContextHolder.getContext().setAuthentication(sessions.authenticate(access));
        } catch (JwtException | AuthenticationException | IllegalArgumentException ex) {
            cookies.clearTokenCookies(response);
            SecurityContextHolder.clearContext();
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Invalid or expired session");
            return;
        } catch (DataAccessException | TransactionException ex) {
            SecurityContextHolder.clearContext();
            response.sendError(HttpServletResponse.SC_SERVICE_UNAVAILABLE, "Authentication temporarily unavailable");
            return;
        }
        // Do not mistake downstream controller failures for authentication failures.
        filterChain.doFilter(request, response);
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getServletPath();
        return !(path.startsWith("/api/") || path.equals("/api") || path.equals("/auth/verify"));
    }
}
