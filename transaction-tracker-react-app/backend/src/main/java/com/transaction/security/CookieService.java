package com.transaction.security;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.Arrays;

@Service
public class CookieService {

    @Value("${app.cookie.secure:true}")       // false only in local dev (no HTTPS)
    private boolean secure;

    @Value("${app.cookie.domain:}")
    private String domain;

    private static final String ACCESS_TOKEN_COOKIE  = "access_token";
    private static final String REFRESH_TOKEN_COOKIE = "refresh_token";

    // ── Set Cookies ───────────────────────────────────────────────────────────

    public void setAccessTokenCookie(HttpServletResponse response, String token, int maxAgeSeconds) {
        setCookie(response, ACCESS_TOKEN_COOKIE, token, maxAgeSeconds);
    }

    public void setRefreshTokenCookie(HttpServletResponse response, String token, int maxAgeSeconds) {
        setCookie(response, REFRESH_TOKEN_COOKIE, token, maxAgeSeconds);
    }

    private void setCookie(HttpServletResponse response, String name, String value, int maxAgeSeconds) {
        Cookie cookie = new Cookie(name, value);
        cookie.setHttpOnly(true);         // JS cannot access — XSS safe
        cookie.setSecure(secure);         // HTTPS only in production
        cookie.setPath("/");              // sent on all requests
        cookie.setMaxAge(maxAgeSeconds);  // 0 = delete, -1 = session
        if (domain != null && !domain.isEmpty()) {
            cookie.setDomain(domain);
        }
        // SameSite=Strict — cookie not sent on cross-site requests (CSRF protection)
        response.addHeader("Set-Cookie", buildSameSiteCookieHeader(cookie));
    }

    private String buildSameSiteCookieHeader(Cookie cookie) {
        StringBuilder sb = new StringBuilder();
        sb.append(cookie.getName()).append("=").append(cookie.getValue());
        sb.append("; Path=").append(cookie.getPath());
        sb.append("; Max-Age=").append(cookie.getMaxAge());
        if (cookie.isHttpOnly()) sb.append("; HttpOnly");
        if (cookie.getSecure())  sb.append("; Secure");
        if (domain != null && !domain.isEmpty()) sb.append("; Domain=").append(domain);
        sb.append("; SameSite=Strict");
        return sb.toString();
    }

    // ── Read Cookies ──────────────────────────────────────────────────────────

    public String getAccessToken(HttpServletRequest request) {
        return getCookieValue(request, ACCESS_TOKEN_COOKIE);
    }

    public String getRefreshToken(HttpServletRequest request) {
        return getCookieValue(request, REFRESH_TOKEN_COOKIE);
    }

    private String getCookieValue(HttpServletRequest request, String name) {
        if (request.getCookies() == null) return null;
        return Arrays.stream(request.getCookies())
                .filter(c -> name.equals(c.getName()))
                .map(Cookie::getValue)
                .findFirst()
                .orElse(null);
    }

    // ── Clear Cookies (logout) ────────────────────────────────────────────────

    public void clearTokenCookies(HttpServletResponse response) {
        setAccessTokenCookie(response, "", 0);
        setRefreshTokenCookie(response, "", 0);
    }
}