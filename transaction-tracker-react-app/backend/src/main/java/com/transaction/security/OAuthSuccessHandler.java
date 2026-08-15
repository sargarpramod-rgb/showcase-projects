package com.transaction.security;

import com.transaction.model.User;
import com.transaction.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.log4j.Log4j2;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Map;

@Log4j2
public class OAuthSuccessHandler implements AuthenticationSuccessHandler {

    private String frontendUrl;

    private JwtService jwtService;

    private CookieService cookieService;

    private UserService userService;

    public OAuthSuccessHandler(String frontendUrl, JwtService jwtService, CookieService cookieService, UserService userService) {
        this.frontendUrl = frontendUrl;
        this.jwtService = jwtService;
        this.cookieService = cookieService;
        this.userService = userService;
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

        Map<String, Object> attributes = oauthUser.getAttributes();

        String auth_provider_user_id = (String) attributes.get("sub");

        log.info("OAuth success for email={}, name={}", email, name);

        User user = userService.getOrCreateUser(auth_provider_user_id, "google",name);
        Long userId = user.getUserId();

        // Generate both tokens
        String accessToken  = jwtService.generateToken(userId, email,name,"google");
        String refreshToken = jwtService.generateRefreshToken(userId, email,name,"google");

        // Set as HttpOnly cookies — never expose in URL or response body
        cookieService.setAccessTokenCookie(response, accessToken, jwtService.getAccessTokenCookieMaxAgeSeconds());
        cookieService.setRefreshTokenCookie(response, refreshToken, jwtService.getRefreshTokenCookieMaxAgeSeconds());

        // Only send non-sensitive display info in the URL
        String encodedName = URLEncoder.encode(name != null ? name : "", StandardCharsets.UTF_8);

        log.info("Tokens set as HttpOnly cookies, redirecting to frontend for email={}", email);

        // Redirect without token in URL — cookies are sent automatically by browser
        response.sendRedirect(frontendUrl + "/login-success?name=" + encodedName);
    }
}