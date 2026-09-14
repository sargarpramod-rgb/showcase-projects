package com.transaction.config;

import com.transaction.security.AuthSessionService;
import com.transaction.security.CookieService;
import com.transaction.security.JwtService;
import com.transaction.security.OAuthSuccessHandler;
import com.transaction.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.boot.autoconfigure.security.servlet.PathRequest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.HeadersConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.util.matcher.AntPathRequestMatcher;
import org.springframework.security.web.util.matcher.OrRequestMatcher;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
@EnableScheduling
@RequiredArgsConstructor
public class SecurityConfig {
    private final JwtService jwtService;
    private final CookieService cookieService;
    private final UserService userService;
    private final AuthSessionService sessions;

    @Value("${frontend.url}")
    private String frontendUrl;
    @Value("${app.cookie.secure:true}")
    private boolean secureCookies;

    @Bean
    SecurityFilterChain filterChain(HttpSecurity http, JwtAuthFilter jwtAuthFilter) throws Exception {
        CookieCsrfTokenRepository csrfRepository = new CookieCsrfTokenRepository();
        // Host-only HttpOnly cookie; JS obtains the masked token from /auth/csrf.
        csrfRepository.setCookieCustomizer(cookie -> cookie.path("/").httpOnly(true)
                .secure(secureCookies).sameSite("Strict"));

        http.cors(cors -> cors.configurationSource(corsConfigurationSource()))
                // H2 console forms do not support CSRF tokens. API and logout remain protected.
                .csrf(csrf -> csrf.csrfTokenRepository(csrfRepository)
                        .ignoringRequestMatchers(PathRequest.toH2Console()))
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(PathRequest.toH2Console()).permitAll()
                        .requestMatchers("/auth/verify", "/api/**").authenticated()
                        .requestMatchers("/auth/**", "/h2-console/**", "/error").permitAll()
                        .anyRequest().permitAll())
                .headers(headers -> headers.frameOptions(HeadersConfigurer.FrameOptionsConfig::sameOrigin))
                // Application logout must go through durable session revocation.
                .logout(logout -> logout.disable())
                .oauth2Login(oauth -> oauth.successHandler(oAuthSuccessHandler()))
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
                .exceptionHandling(ex -> ex.defaultAuthenticationEntryPointFor(
                        new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED),
                        new OrRequestMatcher(new AntPathRequestMatcher("/api/**"),
                                new AntPathRequestMatcher("/auth/verify"))));
        return http.build();
    }

    @Bean
    public JwtAuthFilter jwtAuthFilter() {
        return new JwtAuthFilter(jwtService, cookieService, sessions);
    }

    @Bean
    public FilterRegistrationBean<JwtAuthFilter> jwtServletRegistration(JwtAuthFilter filter) {
        FilterRegistrationBean<JwtAuthFilter> registration = new FilterRegistrationBean<>(filter);
        registration.setEnabled(false);
        return registration;
    }

    @Bean
    public AuthenticationSuccessHandler oAuthSuccessHandler() {
        return new OAuthSuccessHandler(frontendUrl, jwtService, cookieService, userService, sessions);
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of(frontendUrl));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type", "Accept", "Origin",
                "X-Requested-With", "X-XSRF-TOKEN"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
