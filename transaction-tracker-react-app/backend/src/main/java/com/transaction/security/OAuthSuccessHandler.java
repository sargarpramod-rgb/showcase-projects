package com.transaction.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.log4j.Log4j2;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

@Log4j2
public class OAuthSuccessHandler implements AuthenticationSuccessHandler {


    @Autowired
    private JwtService jwtService;

    @Override
    public void onAuthenticationSuccess(
            HttpServletRequest request,
            HttpServletResponse response,
            Authentication authentication
    ) throws IOException {



        OAuth2User oauthUser = (OAuth2User) authentication.getPrincipal();
        String email = oauthUser.getAttribute("email");

        log.info("OAuth success for email={}", email);

        String jwt = jwtService.generateToken(1234l, email);
        String encodedJwt = URLEncoder.encode(jwt, StandardCharsets.UTF_8);

        response.sendRedirect(
                "http://localhost:3000/login-success?token=" + encodedJwt
        );
    }
}
