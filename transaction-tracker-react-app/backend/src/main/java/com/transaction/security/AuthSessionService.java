package com.transaction.security;

import com.transaction.dao.AuthSessionRepository;
import com.transaction.model.AuthSession;
import com.transaction.model.User;
import com.transaction.service.UserService;
import io.jsonwebtoken.Claims;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.Instant;
import java.util.*;

@Service
@RequiredArgsConstructor
public class AuthSessionService {
    private final AuthSessionRepository sessions;
    private final JwtService jwt;
    private final UserService users;

    @Transactional
    public Map<String, String> create(User user, String email, String name, String provider) {
        String sid = UUID.randomUUID().toString();
        Map<String, String> tokens = jwt.issueTokens(user.getUserId(), email, name, provider, sid);
        Claims refresh = jwt.parse(tokens.get("refreshToken"), "refresh");
        Instant now = Instant.now();
        sessions.insert(new AuthSession(sid, user.getUserId(), refresh.getId(),
                refresh.getExpiration().toInstant(), null, now, now));
        return tokens;
    }

    public Authentication authenticate(String accessToken) {
        Claims claims = jwt.parse(accessToken, "access");
        if (jwt.isAccessRevoked(claims.getId())) throw invalid();
        AuthSession session = sessions.find(claims.get("sid", String.class)).orElseThrow(this::invalid);
        requireOwner(session, claims);
        if (session.revokedAt() != null) {
            jwt.blacklistAccess(claims);
            throw invalid();
        }
        return jwt.getAuthentication(claims);
    }

    @Transactional
    public Map<String, String> rotate(String refreshToken) {
        Claims claims = jwt.parse(refreshToken, "refresh");
        String sid = claims.get("sid", String.class);
        AuthSession session = sessions.lock(sid).orElseThrow(this::invalid);
        requireOwner(session, claims);
        Instant now = Instant.now();
        if (session.revokedAt() != null || !session.refreshExpiresAt().isAfter(now)
                || !claims.getExpiration().toInstant().isAfter(now)
                || !session.currentRefreshJti().equals(claims.getId())) throw invalid();

        User user = users.getUserByUserId(session.userId());
        Map<String, String> tokens = jwt.issueTokens(user.getUserId(), claims.get("email", String.class),
                user.getUsername(), user.getAuth_provider(), sid);
        Claims refresh = jwt.parse(tokens.get("refreshToken"), "refresh");
        sessions.rotate(sid, refresh.getId(), refresh.getExpiration().toInstant(), now);
        return tokens;
    }

    @Transactional
    public void logout(String accessToken, String refreshToken) {
        Optional<Claims> access = jwt.logoutClaims(accessToken, "access");
        Optional<Claims> refresh = jwt.logoutClaims(refreshToken, "refresh");
        // Deterministic lock order if the two signed cookies represent different sessions.
        Map<String, Claims> identities = new TreeMap<>();
        access.ifPresent(c -> identities.put(c.get("sid", String.class), c));
        refresh.ifPresent(c -> identities.put(c.get("sid", String.class), c));
        identities.forEach((sid, claims) -> sessions.lock(sid).ifPresent(session -> {
            requireOwner(session, claims);
            sessions.revoke(sid, Instant.now());
        }));

        // Run synchronously after successful commit, before the caller sends success.
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                access.ifPresent(jwt::blacklistAccess);
            }
        });
    }

    private void requireOwner(AuthSession session, Claims claims) {
        if (session.userId() != Long.parseLong(claims.getSubject())) throw invalid();
    }

    private BadCredentialsException invalid() {
        return new BadCredentialsException("Invalid or revoked session");
    }
}
