package com.transaction.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.transaction.model.User;
import com.transaction.model.UserPrincipal;
import com.transaction.service.UserService;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class JwtService {

    private final SecretKey key;
    private final String googleClientId;
    private final long expirationMillis;
    private final long refreshExpirationMillis;

    @Autowired
    private UserService userService;

    // Blacklist: jti → expiry time (cleared lazily to avoid memory leak)
    private final ConcurrentHashMap<String, Date> blacklistedTokens = new ConcurrentHashMap<>();

    public JwtService(
            @Value("${app.jwt.secret}") String secret,
            @Value("${app.google.clientId:}") String googleClientId,
            @Value("${app.jwt.expirationMillis:900000}") long expirationMillis,
            @Value("${app.jwt.refreshExpirationMillis:604800000}") long refreshExpirationMillis) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes());
        this.googleClientId = googleClientId;
        this.expirationMillis = expirationMillis;
        this.refreshExpirationMillis = refreshExpirationMillis;
    }

    // ── Token Generation ──────────────────────────────────────────────────────

    /**
     * Generate a short-lived access token (default 15 minutes).
     */
    public String generateToken(Long userId, String email,String name, String provider) {
        return getToken(userId, email, name, provider,expirationMillis,"access");
    }

    /**
     * Generate a long-lived refresh token (default 7 days).
     */
    public String generateRefreshToken(Long userId, String email,String name, String provider) {
        return getToken(userId, email, name, provider, refreshExpirationMillis,"refresh");
    }

    private String getToken(Long userId, String email, String name,
                            String provider, long expirationMillis, String tokenType) {
        return Jwts.builder()
                .setSubject(String.valueOf(userId))
                .claim("email", email)
                .claim("name", name)
                .claim("provider",provider)
                .claim("type", tokenType)
                .setId(UUID.randomUUID().toString())  // jti — used for blacklisting
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + expirationMillis))
                .signWith(key)
                .compact();
    }



    // ── Token Rotation ────────────────────────────────────────────────────────

    /**
     * Validates the refresh token, blacklists it, and issues a fresh access + refresh token pair.
     * Called automatically by JwtAuthFilter when the access token is expired.
     */
    public Map<String, String> rotateTokens(String refreshToken) {
        Claims claims;
        try {
            claims = parseClaims(refreshToken);
        } catch (ExpiredJwtException e) {
            throw new IllegalArgumentException("Refresh token has expired. Please log in again.");
        } catch (Exception e) {
            throw new IllegalArgumentException("Invalid refresh token.");
        }

        if (!"refresh".equals(claims.get("type"))) {
            throw new IllegalArgumentException("Not a refresh token.");
        }

        if (isBlacklisted(claims.getId())) {
            // Possible token theft — refresh token already used
            throw new IllegalArgumentException("Refresh token already used or invalidated.");
        }

        // TODO: Move this to the database.
        blacklistedTokens.put(claims.getId(), claims.getExpiration());
        cleanExpiredBlacklistEntries();

        Long userId = Long.valueOf(claims.getSubject());
        String email = claims.get("email", String.class);

        User user = userService.getUserByUserId(userId);

        return Map.of(
                "accessToken",  generateToken(userId, email, user.getUsername(), user.getAuth_provider()),
                "refreshToken", generateRefreshToken(userId, email,user.getUsername(), user.getAuth_provider())
        );
    }

    // ── Validation ────────────────────────────────────────────────────────────

    /**
     * Returns true if the token is valid — correctly signed, not expired, not blacklisted.
     * Falls back to Google token check if signature doesn't match our key.
     */
    public boolean isTokenValid(String token) {
        try {
            Claims claims = parseClaims(token);
            if (isBlacklisted(claims.getId())) return false;
            return validateSignedToken(claims);
        } catch (ExpiredJwtException e) {
            return false; // expired — let filter handle auto-refresh
        } catch (Exception e) {
            return false;
        }
    }

    public boolean isExpiredAccessToken(String token) {
        if (token == null || token.isBlank()) {
            return false;
        }

        try {
            parseClaims(token);
            return false; // Valid and not expired

        } catch (ExpiredJwtException e) {
            Claims claims = e.getClaims();

            return claims != null
                    && "access".equals(
                    claims.get("type", String.class)
            )
                    && claims.getSubject() != null
                    && claims.getId() != null
                    && !isBlacklisted(claims.getId());

        } catch (JwtException | IllegalArgumentException e) {
            return false; // Invalid signature, malformed or unsupported
        }
    }

    // ── Authentication ────────────────────────────────────────────────────────

    /**
     * Builds a Spring Security Authentication object from a valid access token.
     */
    public Authentication getAuthentication(String token) {
        Claims claims = parseClaims(token);

        Long userId  = Long.valueOf(claims.getSubject());
        String email = claims.get("email", String.class);

        UserPrincipal userPrincipal = new UserPrincipal( userId, email);

        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                userPrincipal,
                null,
                Collections.singletonList(new SimpleGrantedAuthority("ROLE_USER"))
        );
        auth.setDetails(userId);
        return auth;
    }

    // ── Blacklist / Logout ────────────────────────────────────────────────────

    /**
     * Blacklists a token by its jti so it cannot be used again, even before expiry.
     * Call this for both access and refresh tokens on logout.
     */
    public void invalidateToken(String token) {
        try {
            Claims claims = getClaimsIgnoringExpiry(token);
            String jti    = claims.getId();
            Date expiry   = claims.getExpiration();
            if (jti != null) {
                blacklistedTokens.put(jti, expiry != null ? expiry : new Date());
                cleanExpiredBlacklistEntries();
            }
        } catch (Exception ignored) {
            // Already expired or malformed — nothing to blacklist
        }
    }

    private boolean isBlacklisted(String jti) {
        return jti != null && blacklistedTokens.containsKey(jti);
    }

    /**
     * Remove entries from the blacklist whose tokens have already expired naturally.
     * Called lazily on every blacklist write to prevent unbounded memory growth.
     */
    private void cleanExpiredBlacklistEntries() {
        Date now = new Date();
        blacklistedTokens.entrySet().removeIf(e -> e.getValue().before(now));
    }

    // ── Private Helpers ───────────────────────────────────────────────────────

    /**
     * Parse and validate claims using the app signing key.
     * Throws ExpiredJwtException if expired, other JwtException if invalid.
     */
    private Claims parseClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(key)
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    public int getAccessTokenCookieMaxAgeSeconds() {
        return Math.toIntExact(expirationMillis / 1000);
    }

    public int getRefreshTokenCookieMaxAgeSeconds() {
        return Math.toIntExact(refreshExpirationMillis / 1000);
    }

    /**
     * Extract claims from a token without enforcing expiry.
     * Used only for blacklisting expired tokens on logout.
     */
    private Claims getClaimsIgnoringExpiry(String token) {
        try {
            return parseClaims(token);
        } catch (ExpiredJwtException e) {
            return e.getClaims(); // library provides claims even on expiry
        }
    }

    /**
     * Additional checks for app-issued tokens after signature verification.
     * Rejects expired tokens and validates audience for Google-issuer tokens.
     */
    private boolean validateSignedToken(Claims claims) {
        Date exp = claims.getExpiration();
        if (exp != null && !exp.after(new Date())) return false;

        // Defensive: if somehow a Google issuer appears on an app-signed token
        String issuer = claims.getIssuer();
        if ("accounts.google.com".equals(issuer) || "https://accounts.google.com".equals(issuer)) {
            if (googleClientId != null && !googleClientId.isEmpty()) {
                return googleClientId.equals(claims.getAudience());
            }
        }
        return true;
    }

    /**
     * Validates a Google-issued ID token by decoding the payload without
     * signature verification (Google signs with its own keys).
     * Checks issuer and audience only.
     */
    private boolean isValidGoogleToken(String token) {
        try {
            String[] parts = token.split("\\.");
            if (parts.length < 2) return false;

            String payloadJson = new String(Base64.getUrlDecoder().decode(parts[1]));
            @SuppressWarnings("unchecked")
            Map<String, Object> map = new ObjectMapper().readValue(payloadJson, Map.class);

            String issuer = map.getOrDefault("iss", "").toString();
            boolean issuerOk = "accounts.google.com".equals(issuer)
                    || "https://accounts.google.com".equals(issuer);

            if (!issuerOk) return false;

            Object audObj = map.get("aud");
            if (googleClientId == null || googleClientId.isEmpty() || audObj == null) return false;

            if (audObj instanceof String)     return googleClientId.equals(audObj);
            if (audObj instanceof Collection) return ((Collection<?>) audObj).contains(googleClientId);
            return googleClientId.equals(audObj.toString());

        } catch (Exception e) {
            return false;
        }
    }
}