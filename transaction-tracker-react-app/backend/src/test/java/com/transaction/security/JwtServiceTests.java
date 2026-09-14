package com.transaction.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.nio.charset.StandardCharsets;
import java.time.*;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

import static org.junit.jupiter.api.Assertions.*;

class JwtServiceTests {
    static final String SECRET = "authentication-tests-only-secret-with-at-least-64-bytes-of-key-material";
    private final MutableClock clock = new MutableClock();
    private final JwtService jwt = new JwtService(SECRET, 900_000, 604_800_000, clock);

    @Test
    void issuesDistinctIdentifiersAndRequiresCorrectType() {
        var pair = jwt.issueTokens(1, "user@example.com", "User", "google", "session");
        Claims access = jwt.parse(pair.get("accessToken"), "access");
        Claims refresh = jwt.parse(pair.get("refreshToken"), "refresh");
        assertEquals("session", access.get("sid"));
        assertEquals(access.get("sid"), refresh.get("sid"));
        assertNotEquals(access.getId(), refresh.getId());
        assertEquals(900, Duration.between(access.getIssuedAt().toInstant(),
                access.getExpiration().toInstant()).toSeconds());
        assertThrows(JwtException.class, () -> jwt.parse(pair.get("refreshToken"), "access"));
        assertThrows(JwtException.class, () -> jwt.parse(pair.get("accessToken"), "refresh"));
    }

    @Test
    void requiresSignatureExpirationAndAllIdentityClaims() {
        for (String missing : List.of("jti", "sid", "sub", "exp", "type")) {
            Map<String, Object> claims = validClaims();
            claims.remove(missing);
            assertThrows(JwtException.class, () -> jwt.parse(signed(claims, SECRET), "access"), missing);
        }
        Map<String, Object> claims = validClaims();
        assertThrows(JwtException.class, () -> jwt.parse(signed(claims, SECRET + "different"), "access"));
        claims.put("sub", "not-an-id");
        assertThrows(JwtException.class, () -> jwt.parse(signed(claims, SECRET), "access"));
        assertThrows(JwtException.class, () -> jwt.parse("not.a.jwt", "access"));
    }

    @Test
    void expiresAtExactJwtExpirationAndNeverExtendsBlacklistLifetime() {
        String token = jwt.issueTokens(1, null, null, "google", "session").get("accessToken");
        Claims claims = jwt.parse(token, "access");
        jwt.blacklistAccess(claims);
        clock.now = clock.now.plusSeconds(899);
        jwt.blacklistAccess(claims);
        assertTrue(jwt.isAccessRevoked(claims.getId()));
        clock.now = claims.getExpiration().toInstant();
        assertThrows(JwtException.class, () -> jwt.parse(token, "access"));
        assertFalse(jwt.isAccessRevoked(claims.getId()));
        jwt.blacklistAccess(claims);
        assertEquals(0, cache().size());
        assertTrue(jwt.logoutClaims(token, "access").isPresent());
    }

    @Test
    void scheduledCleanupRemovesExpiredEntriesWithoutNewWritesAndCacheIsBounded() {
        for (int i = 0; i < JwtService.MAX_REVOKED_ACCESS_ENTRIES + 2; i++) {
            Claims claims = Jwts.claims(validClaims());
            claims.setId("id-" + i);
            jwt.blacklistAccess(claims);
        }
        assertEquals(JwtService.MAX_REVOKED_ACCESS_ENTRIES, cache().size());
        clock.now = clock.now.plusSeconds(60);
        jwt.cleanExpiredBlacklistEntries();
        assertEquals(0, cache().size());
    }

    private Map<String, Object> validClaims() {
        Map<String, Object> claims = new HashMap<>();
        claims.put("jti", "id"); claims.put("sid", "session"); claims.put("sub", "1");
        claims.put("type", "access"); claims.put("exp", Date.from(clock.now.plusSeconds(60)));
        return claims;
    }

    private String signed(Map<String, Object> claims, String secret) {
        return Jwts.builder().setClaims(claims)
                .signWith(Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8))).compact();
    }

    @SuppressWarnings("unchecked")
    private ConcurrentHashMap<String, Instant> cache() {
        return (ConcurrentHashMap<String, Instant>) ReflectionTestUtils.getField(jwt, "blacklistedTokens");
    }

    static class MutableClock extends Clock {
        Instant now = Instant.parse("2026-01-01T00:00:00Z");
        public ZoneId getZone() { return ZoneOffset.UTC; }
        public Clock withZone(ZoneId zone) { return this; }
        public Instant instant() { return now; }
    }
}
