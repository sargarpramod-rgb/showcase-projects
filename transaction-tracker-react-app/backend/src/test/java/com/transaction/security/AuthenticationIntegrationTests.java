package com.transaction.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.transaction.config.JwtAuthFilter;
import com.transaction.dao.AuthSessionRepository;
import com.transaction.model.AuthSession;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.mock.mockito.SpyBean;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.ApplicationContext;
import org.springframework.dao.DataAccessResourceFailureException;

import java.nio.charset.StandardCharsets;
import java.util.Date;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class AuthenticationIntegrationTests extends AuthTestBase {
    @Autowired ObjectMapper json;
    @Autowired ApplicationContext context;
    @SpyBean AuthSessionRepository sessionRepository;

    @AfterEach
    void resetRepository() { reset(sessionRepository); }

    @Test
    void verifiesAuthenticationAndRejectsRefreshAsAccess() throws Exception {
        mvc.perform(get("/auth/verify").servletPath("/auth/verify")).andExpect(status().isUnauthorized());
        var pair = login();
        mvc.perform(get("/auth/verify").servletPath("/auth/verify")
                        .cookie(new Cookie("access_token", pair.get("accessToken"))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("valid"));
        mvc.perform(get("/api/probe").servletPath("/api/probe")
                        .cookie(new Cookie("access_token", pair.get("refreshToken"))))
                .andExpect(status().isUnauthorized());
        assertEquals(1, context.getBeansOfType(JwtAuthFilter.class).size());
        assertFalse(context.getBean("jwtServletRegistration", FilterRegistrationBean.class).isEnabled());
    }

    @Test
    void logoutRequiresCsrfDeletesCookiesAndRejectsReplay() throws Exception {
        var pair = login();
        Cookie access = new Cookie("access_token", pair.get("accessToken"));
        Cookie refresh = new Cookie("refresh_token", pair.get("refreshToken"));
        mvc.perform(post("/auth/logout").servletPath("/auth/logout").cookie(access, refresh))
                .andExpect(status().isForbidden());
        assertNotNull(sessions.authenticate(pair.get("accessToken")));
        Csrf csrf = csrf();
        var response = mvc.perform(post("/auth/logout").servletPath("/auth/logout")
                        .cookie(access, refresh, csrf.cookie()).header(csrf.header(), csrf.token()))
                .andExpect(status().isOk()).andReturn().getResponse();
        for (String name : new String[]{"access_token", "refresh_token"}) {
            Cookie deleted = response.getCookie(name);
            assertNotNull(deleted);
            assertEquals(0, deleted.getMaxAge());
            assertTrue(deleted.isHttpOnly());
            assertEquals("/", deleted.getPath());
            assertTrue(response.getHeaders("Set-Cookie").stream()
                    .anyMatch(h -> h.startsWith(name + "=") && h.contains("SameSite=Strict")));
        }
        mvc.perform(get("/api/probe").servletPath("/api/probe").cookie(access))
                .andExpect(status().isUnauthorized());
        mvc.perform(get("/api/probe").servletPath("/api/probe").cookie(refresh))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void mutationRequiresCsrfAndRejectsUntrustedOrigin() throws Exception {
        var pair = login();
        Cookie access = new Cookie("access_token", pair.get("accessToken"));
        mvc.perform(post("/api/probe").servletPath("/api/probe").cookie(access))
                .andExpect(status().isForbidden());
        Csrf csrf = csrf();
        mvc.perform(post("/api/probe").servletPath("/api/probe").cookie(access, csrf.cookie())
                        .header(csrf.header(), csrf.token())).andExpect(status().isOk());
        mvc.perform(post("/auth/logout").servletPath("/auth/logout").cookie(access, csrf.cookie())
                        .header(csrf.header(), csrf.token()).header("Origin", "https://attacker.invalid"))
                .andExpect(status().isForbidden());
    }

    @Test
    void refreshOnlyLogoutAndMalformedCookieLogoutAreIdempotent() throws Exception {
        var pair = login();
        Csrf csrf = csrf();
        for (int i = 0; i < 2; i++) {
            mvc.perform(post("/auth/logout").servletPath("/auth/logout")
                            .cookie(new Cookie("refresh_token", pair.get("refreshToken")), csrf.cookie())
                            .header(csrf.header(), csrf.token())).andExpect(status().isOk());
        }
        mvc.perform(get("/api/probe").servletPath("/api/probe")
                        .cookie(new Cookie("access_token", pair.get("accessToken"))))
                .andExpect(status().isUnauthorized());
        mvc.perform(post("/auth/logout").servletPath("/auth/logout")
                        .cookie(new Cookie("access_token", "malformed"), csrf.cookie())
                        .header(csrf.header(), csrf.token()))
                .andExpect(status().isOk());
    }

    @Test
    void autoRefreshWorksForMissingAndExpiredAccessAndPreservesSid() throws Exception {
        for (boolean expiredAccess : new boolean[]{false, true}) {
            var pair = login();
            var request = get("/api/probe").servletPath("/api/probe")
                    .cookie(new Cookie("refresh_token", pair.get("refreshToken")));
            if (expiredAccess) {
                var claims = jwt.parse(pair.get("accessToken"), "access");
                String expired = Jwts.builder().setClaims(claims)
                        .setExpiration(new Date(System.currentTimeMillis() - 1000))
                        .signWith(Keys.hmacShaKeyFor(JwtServiceTests.SECRET.getBytes(StandardCharsets.UTF_8))).compact();
                request.cookie(new Cookie("access_token", expired));
            }
            var response = mvc.perform(request).andExpect(status().isOk()).andReturn().getResponse();
            String replacement = response.getCookie("refresh_token").getValue();
            assertNotEquals(pair.get("refreshToken"), replacement);
            assertEquals(jwt.parse(pair.get("refreshToken"), "refresh").get("sid"),
                    jwt.parse(replacement, "refresh").get("sid"));
        }
    }

    @Test
    void failedDatabaseLogoutDoesNotClaimSuccessOrUpdateCache() throws Exception {
        var pair = login();
        var access = jwt.parse(pair.get("accessToken"), "access");
        doThrow(new DataAccessResourceFailureException("simulated failure"))
                .when(sessionRepository).revoke(anyString(), any());
        Csrf csrf = csrf();
        var response = mvc.perform(post("/auth/logout").servletPath("/auth/logout")
                        .cookie(new Cookie("access_token", pair.get("accessToken")), csrf.cookie())
                        .header(csrf.header(), csrf.token()))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.message").value("Server logout failed. The session may still be active."))
                .andReturn().getResponse();
        assertEquals(0, response.getCookie("access_token").getMaxAge());
        assertEquals(0, response.getCookie("refresh_token").getMaxAge());
        assertFalse(jwt.isAccessRevoked(access.getId()));
        assertNull(repository.find(access.get("sid", String.class)).orElseThrow().revokedAt());
    }

    @Test
    void databaseFailureFailsClosedAndDoesNotBecomeInvalidCredentials() throws Exception {
        var pair = login();
        doThrow(new DataAccessResourceFailureException("simulated failure"))
                .when(sessionRepository).find(anyString());
        mvc.perform(get("/api/probe").servletPath("/api/probe")
                        .cookie(new Cookie("access_token", pair.get("accessToken"))))
                .andExpect(status().isServiceUnavailable());
    }

    private Csrf csrf() throws Exception {
        var response = mvc.perform(get("/auth/csrf").servletPath("/auth/csrf"))
                .andExpect(status().isOk()).andReturn().getResponse();
        var body = json.readTree(response.getContentAsString());
        return new Csrf(response.getCookie("XSRF-TOKEN"),
                body.get("headerName").asText(), body.get("token").asText());
    }

    record Csrf(Cookie cookie, String header, String token) {}
}
