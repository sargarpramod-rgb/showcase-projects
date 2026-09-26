package com.transaction.security;

import com.transaction.dao.AuthSessionRepository;
import com.transaction.service.UserService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.Map;
import java.util.concurrent.*;

import static org.junit.jupiter.api.Assertions.*;

class AuthSessionServiceTests extends AuthTestBase {
    @Autowired PlatformTransactionManager transactionManager;
    @Autowired UserService users;

    @Test
    void rotationPreservesSessionAndRejectsOldRefreshIncludingAfterServiceRestart() {
        var first = login();
        var second = sessions.rotate(first.get("refreshToken"));
        var before = jwt.parse(first.get("refreshToken"), "refresh");
        var after = jwt.parse(second.get("refreshToken"), "refresh");
        assertEquals(before.get("sid"), after.get("sid"));
        assertNotEquals(before.getId(), after.getId());
        assertThrows(BadCredentialsException.class, () -> sessions.rotate(first.get("refreshToken")));
        sessions.logout(second.get("accessToken"), second.get("refreshToken"));
        JwtService restartedJwt = new JwtService(JwtServiceTests.SECRET, 900_000, 604_800_000);
        AuthSessionService restarted = new AuthSessionService(new AuthSessionRepository(jdbc), restartedJwt, users);
        assertThrows(BadCredentialsException.class, () -> restarted.authenticate(first.get("accessToken")));
        assertThrows(BadCredentialsException.class, () -> restarted.authenticate(second.get("accessToken")));
        new TransactionTemplate(transactionManager).executeWithoutResult(status ->
                assertThrows(BadCredentialsException.class, () -> restarted.rotate(second.get("refreshToken"))));
    }

    @Test
    void logoutIsIdempotentAndUpdatesCacheImmediately() {
        var pair = login();
        var access = jwt.parse(pair.get("accessToken"), "access");
        sessions.logout(pair.get("accessToken"), pair.get("refreshToken"));
        var revoked = repository.find(access.get("sid", String.class)).orElseThrow().revokedAt();
        assertNotNull(revoked);
        assertTrue(jwt.isAccessRevoked(access.getId()));
        sessions.logout(pair.get("accessToken"), pair.get("refreshToken"));
        assertEquals(revoked, repository.find(access.get("sid", String.class)).orElseThrow().revokedAt());
        sessions.logout(null, null);
        sessions.logout("malformed", "malformed");
    }

    @Test
    void eitherCookieRevokesSessionAndOtherSessionsStayActive() {
        var accessOnly = login();
        var refreshOnly = login();
        var unaffected = login();
        sessions.logout(accessOnly.get("accessToken"), null);
        sessions.logout(null, refreshOnly.get("refreshToken"));
        assertThrows(BadCredentialsException.class, () -> sessions.rotate(accessOnly.get("refreshToken")));
        assertThrows(BadCredentialsException.class, () -> sessions.authenticate(refreshOnly.get("accessToken")));
        assertNotNull(sessions.authenticate(unaffected.get("accessToken")));
    }

    @Test
    void missingSessionNeverAuthenticatesAndExpiredSessionCannotRefresh() {
        var orphan = jwt.issueTokens(1, "test@example.com", "Test", "google", "missing");
        assertThrows(BadCredentialsException.class, () -> sessions.authenticate(orphan.get("accessToken")));
        var pair = login();
        String sid = jwt.parse(pair.get("refreshToken"), "refresh").get("sid", String.class);
        jdbc.update("UPDATE auth_sessions SET refresh_expires_at = TIMESTAMP '2000-01-01 00:00:00' WHERE session_id = ?", sid);
        assertThrows(BadCredentialsException.class, () -> sessions.rotate(pair.get("refreshToken")));
    }

    @Test
    void concurrentRefreshHasExactlyOneWinner() throws Exception {
        var pair = login();
        try (ExecutorService executor = Executors.newFixedThreadPool(2)) {
            CountDownLatch start = new CountDownLatch(1);
            Callable<Boolean> refresh = () -> {
                start.await();
                try { sessions.rotate(pair.get("refreshToken")); return true; }
                catch (BadCredentialsException ex) { return false; }
            };
            Future<Boolean> one = executor.submit(refresh);
            Future<Boolean> two = executor.submit(refresh);
            start.countDown();
            assertNotEquals(one.get(10, TimeUnit.SECONDS), two.get(10, TimeUnit.SECONDS));
        }
    }

    @Test
    void logoutAndRefreshWaitForRowLockAndCannotResurrectSession() throws Exception {
        var pair = login();
        String sid = jwt.parse(pair.get("refreshToken"), "refresh").get("sid", String.class);
        try (ExecutorService executor = Executors.newFixedThreadPool(2)) {
            new TransactionTemplate(transactionManager).executeWithoutResult(status -> {
                repository.lock(sid).orElseThrow();
                CountDownLatch started = new CountDownLatch(2);
                Future<?> logout = executor.submit(() -> {
                    started.countDown();
                    sessions.logout(pair.get("accessToken"), pair.get("refreshToken"));
                });
                Future<?> refresh = executor.submit(() -> {
                    started.countDown();
                    try { sessions.rotate(pair.get("refreshToken")); }
                    catch (BadCredentialsException ignored) { }
                });
                try {
                    assertTrue(started.await(5, TimeUnit.SECONDS));
                    assertThrows(TimeoutException.class, () -> logout.get(150, TimeUnit.MILLISECONDS));
                    assertThrows(TimeoutException.class, () -> refresh.get(150, TimeUnit.MILLISECONDS));
                } catch (InterruptedException ex) {
                    Thread.currentThread().interrupt();
                    throw new RuntimeException(ex);
                }
            });
            executor.shutdown();
            assertTrue(executor.awaitTermination(10, TimeUnit.SECONDS));
        }
        assertNotNull(repository.find(sid).orElseThrow().revokedAt());
        assertThrows(BadCredentialsException.class, () -> sessions.authenticate(pair.get("accessToken")));
        assertThrows(BadCredentialsException.class, () -> sessions.rotate(pair.get("refreshToken")));
    }

    @Test
    void tokensRotatedBeforeLogoutAreAlsoRejected() {
        var pair = login();
        Map<String, String> rotated = sessions.rotate(pair.get("refreshToken"));
        sessions.logout(pair.get("accessToken"), pair.get("refreshToken"));
        assertThrows(BadCredentialsException.class, () -> sessions.authenticate(rotated.get("accessToken")));
        assertThrows(BadCredentialsException.class, () -> sessions.rotate(rotated.get("refreshToken")));
    }
}
