package com.transaction.security;

import com.transaction.model.UserPrincipal;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class JwtService {
    private final SecretKey key;
    private final long expirationMillis;
    private final long refreshExpirationMillis;
    private final Clock clock;
    static final int MAX_REVOKED_ACCESS_ENTRIES = 10_000;
    private final ConcurrentHashMap<String, Instant> blacklistedTokens = new ConcurrentHashMap<>();

    @Autowired
    public JwtService(@Value("${app.jwt.secret}") String secret,
                      @Value("${app.jwt.expirationMillis:900000}") long expirationMillis,
                      @Value("${app.jwt.refreshExpirationMillis:604800000}") long refreshExpirationMillis) {
        this(secret, expirationMillis, refreshExpirationMillis, Clock.systemUTC());
    }

    JwtService(String secret, long expirationMillis, long refreshExpirationMillis, Clock clock) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        if (expirationMillis < 1000 || refreshExpirationMillis < expirationMillis) {
            throw new IllegalArgumentException("Invalid JWT lifetimes");
        }
        this.expirationMillis = expirationMillis;
        this.refreshExpirationMillis = refreshExpirationMillis;
        this.clock = clock;
    }

    public Map<String, String> issueTokens(long userId, String email, String name, String provider, String sid) {
        return Map.of("accessToken", token(userId, email, name, provider, sid, "access", expirationMillis),
                "refreshToken", token(userId, email, name, provider, sid, "refresh", refreshExpirationMillis));
    }

    private String token(long userId, String email, String name, String provider,
                         String sid, String type, long lifetime) {
        Instant now = clock.instant();
        return Jwts.builder().setSubject(Long.toString(userId))
                .claim("email", email).claim("name", name).claim("provider", provider)
                .claim("type", type).claim("sid", sid).setId(UUID.randomUUID().toString())
                .setIssuedAt(Date.from(now)).setExpiration(Date.from(now.plusMillis(lifetime)))
                .signWith(key).compact();
    }

    public Claims parse(String token, String type) {
        return parse(token, type, false);
    }

    private Claims parse(String token, String type, boolean allowExpired) {
        Claims claims;
        try {
            claims = Jwts.parserBuilder().setSigningKey(key)
                    .setClock(() -> Date.from(clock.instant())).build().parseClaimsJws(token).getBody();
        } catch (ExpiredJwtException ex) {
            if (!allowExpired) throw ex;
            // JJWT verifies the signature before reporting expiration.
            claims = ex.getClaims();
        }
        if (!type.equals(claims.get("type", String.class))
                || blank(claims.getId()) || blank(claims.get("sid", String.class))
                || blank(claims.getSubject()) || claims.getExpiration() == null) {
            throw new JwtException("Missing or invalid token claims");
        }
        try {
            if (Long.parseLong(claims.getSubject()) <= 0) throw new NumberFormatException();
        } catch (NumberFormatException ex) {
            throw new JwtException("Invalid subject", ex);
        }
        if (!allowExpired && !claims.getExpiration().toInstant().isAfter(clock.instant())) {
            throw new JwtException("Token expired");
        }
        return claims;
    }

    private boolean blank(String value) {
        return value == null || value.isBlank();
    }

    public Optional<Claims> logoutClaims(String token, String type) {
        if (token == null) return Optional.empty();
        try {
            return Optional.of(parse(token, type, true));
        } catch (JwtException | IllegalArgumentException ex) {
            return Optional.empty();
        }
    }

    public boolean isExpiredAccessToken(String token) {
        if (token == null) return false;
        try {
            Claims claims = parse(token, "access", true);
            return !claims.getExpiration().toInstant().isAfter(clock.instant())
                    && !isAccessRevoked(claims.getId());
        } catch (JwtException | IllegalArgumentException ex) {
            return false;
        }
    }

    // Cryptographic validation only. Authentication also requires AuthSessionService's DB check.
    public boolean isTokenValid(String token) {
        try {
            return !isAccessRevoked(parse(token, "access").getId());
        } catch (JwtException | IllegalArgumentException ex) {
            return false;
        }
    }

    public Authentication getAuthentication(String token) {
        return getAuthentication(parse(token, "access"));
    }

    public Authentication getAuthentication(Claims claims) {
        long userId = Long.parseLong(claims.getSubject());
        var auth = new UsernamePasswordAuthenticationToken(
                new UserPrincipal(userId, claims.get("email", String.class)), null,
                List.of(new SimpleGrantedAuthority("ROLE_USER")));
        auth.setDetails(userId);
        return auth;
    }

    public boolean isAccessRevoked(String jti) {
        Instant expires = blacklistedTokens.get(jti);
        if (expires == null) return false;
        if (!expires.isAfter(clock.instant())) {
            blacklistedTokens.remove(jti, expires);
            return false;
        }
        return true;
    }

    // Bounded optimization only: eviction cannot allow access because cache misses check the DB.
    public synchronized void blacklistAccess(Claims claims) {
        Instant expires = claims.getExpiration().toInstant();
        if (!expires.isAfter(clock.instant())) return;
        cleanExpiredBlacklistEntries();
        if (!blacklistedTokens.containsKey(claims.getId())
                && blacklistedTokens.size() >= MAX_REVOKED_ACCESS_ENTRIES) {
            blacklistedTokens.keySet().stream().findFirst().ifPresent(blacklistedTokens::remove);
        }
        blacklistedTokens.put(claims.getId(), expires);
    }

    @Scheduled(fixedDelay = 60_000)
    public void cleanExpiredBlacklistEntries() {
        Instant now = clock.instant();
        blacklistedTokens.entrySet().removeIf(entry -> !entry.getValue().isAfter(now));
    }

    public int getAccessTokenCookieMaxAgeSeconds() {
        return Math.toIntExact(expirationMillis / 1000);
    }

    public int getRefreshTokenCookieMaxAgeSeconds() {
        return Math.toIntExact(refreshExpirationMillis / 1000);
    }
}
