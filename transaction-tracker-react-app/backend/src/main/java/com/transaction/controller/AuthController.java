package com.transaction.controller;

import com.transaction.security.AuthSessionService;
import com.transaction.security.CookieService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
@Slf4j
public class AuthController {
    private final AuthSessionService sessions;
    private final CookieService cookies;

    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletRequest request, HttpServletResponse response) {
        try {
            sessions.logout(cookies.getAccessToken(request), cookies.getRefreshToken(request));
            return ResponseEntity.ok(Map.of("message", "Logged out successfully"));
        } catch (RuntimeException ex) {
            log.error("Durable logout failed", ex);
            return ResponseEntity.status(503).body(Map.of("message",
                    "Server logout failed. The session may still be active."));
        } finally {
            cookies.clearTokenCookies(response);
            SecurityContextHolder.clearContext();
            var session = request.getSession(false);
            if (session != null) session.invalidate();
        }
    }

    @GetMapping("/verify")
    public ResponseEntity<?> verify(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(Map.of("status", "valid"));
    }

    @GetMapping("/csrf")
    public ResponseEntity<?> csrf(CsrfToken token) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .body(Map.of("headerName", token.getHeaderName(), "token", token.getToken()));
    }
}
