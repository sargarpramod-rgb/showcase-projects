package com.transaction.dao;

import com.transaction.model.AuthSession;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.Optional;

@Repository
@RequiredArgsConstructor
public class AuthSessionRepository {
    private final JdbcTemplate jdbc;
    private static final RowMapper<AuthSession> MAPPER = (rs, row) -> {
        Timestamp revoked = rs.getTimestamp("revoked_at");
        return new AuthSession(rs.getString("session_id"), rs.getLong("user_id"),
                rs.getString("current_refresh_jti"), rs.getTimestamp("refresh_expires_at").toInstant(),
                revoked == null ? null : revoked.toInstant(),
                rs.getTimestamp("created_at").toInstant(), rs.getTimestamp("updated_at").toInstant());
    };

    public void insert(AuthSession session) {
        jdbc.update("""
                INSERT INTO auth_sessions
                (session_id, user_id, current_refresh_jti, refresh_expires_at, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """, session.sessionId(), session.userId(), session.currentRefreshJti(),
                Timestamp.from(session.refreshExpiresAt()), Timestamp.from(session.createdAt()),
                Timestamp.from(session.updatedAt()));
    }

    public Optional<AuthSession> find(String sid) {
        return jdbc.query("SELECT * FROM auth_sessions WHERE session_id = ?", MAPPER, sid)
                .stream().findFirst();
    }

    // Call only inside the service transaction; the lock lasts until commit/rollback.
    public Optional<AuthSession> lock(String sid) {
        return jdbc.query("SELECT * FROM auth_sessions WHERE session_id = ? FOR UPDATE", MAPPER, sid)
                .stream().findFirst();
    }

    public void rotate(String sid, String refreshJti, Instant expiresAt, Instant now) {
        jdbc.update("""
                UPDATE auth_sessions SET current_refresh_jti = ?, refresh_expires_at = ?, updated_at = ?
                WHERE session_id = ?
                """, refreshJti, Timestamp.from(expiresAt), Timestamp.from(now), sid);
    }

    public void revoke(String sid, Instant now) {
        jdbc.update("""
                UPDATE auth_sessions SET revoked_at = ?, updated_at = ?
                WHERE session_id = ? AND revoked_at IS NULL
                """, Timestamp.from(now), Timestamp.from(now), sid);
    }
}
