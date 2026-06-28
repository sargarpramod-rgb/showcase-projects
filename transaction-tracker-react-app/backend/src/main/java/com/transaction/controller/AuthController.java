package com.transaction.controller;

import com.transaction.security.CookieService;
import com.transaction.security.JwtService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/auth")
public class AuthController {

    @Autowired
    private JwtService jwtService;

    @Autowired
    private CookieService cookieService;

    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletRequest request,
                                    HttpServletResponse response) {

        // Read tokens from HttpOnly cookies
        String accessToken  = cookieService.getAccessToken(request);
        String refreshToken = cookieService.getRefreshToken(request);

        // Blacklist both tokens so they can't be reused
        if (accessToken  != null) jwtService.invalidateToken(accessToken);
        if (refreshToken != null) jwtService.invalidateToken(refreshToken);

        // Clear cookies from browser (sets Max-Age=0)
        cookieService.clearTokenCookies(response);

        return ResponseEntity.ok(Map.of("message", "Logged out successfully"));
    }

    @GetMapping("/verify")
    public ResponseEntity<?> verify() {
        // JwtAuthFilter already validated the cookie before reaching here
        // If we're here, the session is valid
        return ResponseEntity.ok(Map.of("status", "valid"));
    }
}