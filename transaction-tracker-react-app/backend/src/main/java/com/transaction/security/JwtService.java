package com.transaction.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.util.Collections;
import java.util.Date;
import java.util.Base64;
import java.util.Collection;
import java.util.Map;

@Service
public class JwtService {

    private final SecretKey key;
    private final String googleClientId;
    private final long expirationMillis;

    // Accept app JWT secret, the Google OAuth client ID for audience checks, and token TTL
    public JwtService(@Value("${app.jwt.secret}") String secret,
                      @Value("${app.google.clientId:}") String googleClientId,
                      @Value("${app.jwt.expirationMillis:300000}") long expirationMillis) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes());
        this.googleClientId = googleClientId;
        this.expirationMillis = expirationMillis;
    }

    // Generate a short-lived token; TTL is configurable via app.jwt.expirationMillis (default 5 minutes)
    public String generateToken(Long userId, String email) {
        return Jwts.builder()
                .setSubject(email)
                .claim("userId", userId)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + expirationMillis))
                .signWith(key)
                .compact();
    }

    public boolean isTokenValid(String token) {
        try {
            // First try verifying signature using the app secret (for tokens issued by this app)
            Claims claims = Jwts.parserBuilder()
                    .setSigningKey(key)
                    .build()
                    .parseClaimsJws(token)
                    .getBody();

            // If parsing with our key succeeded, it's a token issued by this app.
            // Accept it if it's not expired. For Google tokens (signed by Google) parsing
            // with our key will fail and control will fall to the catch block below.
            return validateSignedToken(claims);
        } catch (Exception e) {
            // If signature verification failed, attempt a safe extraction of claims without signature verification
            // This allows checking tokens issued by Google (which are signed with Google's keys).
            try {
                String[] parts = token.split("\\.");
                if (parts.length < 2) return false;

                String payloadJson = new String(Base64.getUrlDecoder().decode(parts[1]));
                ObjectMapper mapper = new ObjectMapper();
                // read into a raw map to avoid a TypeReference generic-warning in some IDEs
                @SuppressWarnings("unchecked")
                Map<String, Object> map = mapper.readValue(payloadJson, Map.class);

                // Build a Claims-like check for issuer and audience
                Object issObj = map.get("iss");
                String issuer = issObj == null ? null : issObj.toString();

                Object audObj = map.get("aud");

                boolean audMatches = false;
                if (googleClientId != null && !googleClientId.isEmpty() && audObj != null) {
                    if (audObj instanceof String) {
                        audMatches = googleClientId.equals(audObj);
                    } else if (audObj instanceof Collection) {
                        audMatches = ((Collection<?>) audObj).contains(googleClientId);
                    } else {
                        audMatches = googleClientId.equals(audObj.toString());
                    }
                }

                boolean issuerOk = "accounts.google.com".equals(issuer) || "https://accounts.google.com".equals(issuer);

                return issuerOk && audMatches;
            } catch (Exception ex) {
                return false;
            }
        }
    }

    /**
     * Validate a token claims that were successfully parsed with the app signing key.
     * For app-issued tokens we only need to ensure the token is not expired. If the
     * token contains an issuer equal to Google's issuer, we additionally check audience
     * to be defensive (though Google-signed tokens won't parse with our key).
     */
    private boolean validateSignedToken(Claims claims) {
        Date exp = claims.getExpiration();
        boolean notExpired = (exp == null) || exp.after(new Date());
        if (!notExpired) return false;

        // If a Google issuer is present for some reason, ensure audience matches.
        String issuer = claims.getIssuer();
        if ("accounts.google.com".equals(issuer) || "https://accounts.google.com".equals(issuer)) {
            String audience = claims.getAudience();
            if (googleClientId != null && !googleClientId.isEmpty()) {
                return googleClientId.equals(audience);
            }
        }

        return true;
    }


    public Authentication getAuthentication(String token) {
        Claims claims = Jwts.parserBuilder()
                .setSigningKey(key)
                .build()
                .parseClaimsJws(token)
                .getBody();

        String email = claims.getSubject();
        Object userId = claims.get("userId");

        // Create Authentication token with ROLE_USER authority and attach userId as details
        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                email,                  // principal
                null,                   // credentials
                Collections.singletonList(new SimpleGrantedAuthority("ROLE_USER"))
        );

        auth.setDetails(userId);

        return auth;
    }

}
