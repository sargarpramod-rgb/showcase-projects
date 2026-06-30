package com.transaction.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.log4j.Log4j2;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

@Log4j2
public class OAuthSuccessHandler implements AuthenticationSuccessHandler {

    private String frontendUrl;

    private JwtService jwtService;

    private CookieService cookieService;

    public OAuthSuccessHandler(String frontendUrl, JwtService jwtService, CookieService cookieService) {
        this.frontendUrl = frontendUrl;
        this.jwtService = jwtService;
        this.cookieService = cookieService;
    }

    @Override
    public void onAuthenticationSuccess(
            HttpServletRequest request,
            HttpServletResponse response,
            Authentication authentication
    ) throws IOException {

        OAuth2User oauthUser = (OAuth2User) authentication.getPrincipal();
        String email = oauthUser.getAttribute("email");
        String name  = oauthUser.getAttribute("name");

        log.info("OAuth success for email={}, name={}", email, name);

        // TODO: replace 1234L with real userId lookup from your DB
        Long userId = 1234L;

        // Generate both tokens
        String accessToken  = jwtService.generateToken(userId, email);
        String refreshToken = jwtService.generateRefreshToken(userId, email);

        // Set as HttpOnly cookies — never expose in URL or response body
        cookieService.setAccessTokenCookie(response, accessToken, 15 * 60);           // 15 min
        cookieService.setRefreshTokenCookie(response, refreshToken, 7 * 24 * 60 * 60); // 7 days

        // Only send non-sensitive display info in the URL
        String encodedName = URLEncoder.encode(name != null ? name : "", StandardCharsets.UTF_8);

        log.info("Tokens set as HttpOnly cookies, redirecting to frontend for email={}", email);

        // Redirect without token in URL — cookies are sent automatically by browser
        response.sendRedirect(frontendUrl + "/login-success?name=" + encodedName);
    }
}