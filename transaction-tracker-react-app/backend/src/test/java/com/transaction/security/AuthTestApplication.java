package com.transaction.security;

import com.transaction.config.SecurityConfig;
import com.transaction.controller.AuthController;
import com.transaction.dao.AuthSessionRepository;
import com.transaction.dao.UserRepository;
import com.transaction.model.User;
import com.transaction.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.SpringBootConfiguration;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.autoconfigure.h2.H2ConsoleProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.registration.InMemoryClientRegistrationRepository;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.*;

@SpringBootConfiguration
@EnableAutoConfiguration
@EnableConfigurationProperties(H2ConsoleProperties.class)
@Import({SecurityConfig.class, JwtService.class, CookieService.class, AuthSessionService.class,
        AuthSessionRepository.class, UserService.class, UserRepository.class, AuthController.class})
class AuthTestApplication {
    @Bean
    ClientRegistrationRepository clients() {
        return new InMemoryClientRegistrationRepository(ClientRegistration.withRegistrationId("google")
                .clientId("test").clientSecret("test").scope("openid", "email", "profile")
                .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
                .redirectUri("{baseUrl}/login/oauth2/code/{registrationId}")
                .authorizationUri("https://example.invalid/authorize")
                .tokenUri("https://example.invalid/token")
                .jwkSetUri("https://example.invalid/keys")
                .userInfoUri("https://example.invalid/user").userNameAttributeName("sub").build());
    }

    @RestController
    static class Probe {
        @GetMapping("/api/probe")
        String get() { return "authenticated"; }
        @PostMapping("/api/probe")
        String post() { return "updated"; }
    }
}

@SpringBootTest(classes = AuthTestApplication.class, properties = {
        "spring.config.location=optional:classpath:/auth-test-absent.properties",
        "spring.datasource.url=jdbc:h2:mem:auth-tests;DB_CLOSE_DELAY=-1;LOCK_TIMEOUT=5000",
        "spring.datasource.username=sa", "spring.datasource.password=",
        "spring.sql.init.mode=always", "spring.sql.init.schema-locations=classpath:schema.sql",
        "spring.sql.init.data-locations=optional:classpath:/no-auth-data.sql",
        "app.jwt.secret=authentication-tests-only-secret-with-at-least-64-bytes-of-key-material",
        "app.jwt.expirationMillis=900000", "app.jwt.refreshExpirationMillis=604800000",
        "app.cookie.secure=false", "frontend.url=http://localhost:3000"
})
@AutoConfigureMockMvc
abstract class AuthTestBase {
    @Autowired AuthSessionService sessions;
    @Autowired AuthSessionRepository repository;
    @Autowired JwtService jwt;
    @Autowired JdbcTemplate jdbc;
    @Autowired MockMvc mvc;

    User newUser() {
        Long id = jdbc.queryForObject("SELECT COALESCE(MAX(user_id), 0) + 1 FROM users", Long.class);
        jdbc.update("INSERT INTO users(user_id, username) VALUES (?, ?)", id, "Test User");
        jdbc.update("INSERT INTO user_auth_provider(user_id, auth_provider, auth_provider_user_id) VALUES (?, ?, ?)",
                id, "google", java.util.UUID.randomUUID().toString());
        User user = new User();
        user.setUserId(id);
        user.setUsername("Test User");
        user.setAuth_provider("google");
        return user;
    }

    java.util.Map<String, String> login() {
        return sessions.create(newUser(), "test@example.com", "Test User", "google");
    }
}
