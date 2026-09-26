package com.transaction.model;

import java.time.Instant;

public record AuthSession(String sessionId, long userId, String currentRefreshJti,
                          Instant refreshExpiresAt, Instant revokedAt,
                          Instant createdAt, Instant updatedAt) {
}
