package com.transaction.config;

import com.transaction.security.CookieService;
import com.transaction.security.JwtService;
import com.transaction.security.OAuthSuccessHandler;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.util.matcher.AntPathRequestMatcher;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Autowired
    JwtService jwtService;

    @Autowired
    CookieService cookieService;

    @Value("${frontend.url}")
    private String frontendUrl;

    @Bean
    SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                // ── CORS must come before CSRF ────────────────────────────────────
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))

                // ── CSRF disabled for stateless JWT/cookie API ────────────────────
                // SameSite=Strict on cookies provides CSRF protection instead
                .csrf(csrf -> csrf.disable())

                .sessionManagement(sm -> sm
                        .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                )

                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/auth/**").permitAll()   // login, logout, verify
                        .requestMatchers("/api/**").authenticated()
                        .anyRequest().permitAll()
                )

                .oauth2Login(oauth -> oauth
                        .successHandler(oAuthSuccessHandler())
                )

                // ── JWT filter reads HttpOnly cookies on every request ────────────
                .addFilterBefore(
                        new JwtAuthFilter(jwtService, cookieService),
                        UsernamePasswordAuthenticationFilter.class
                )

                .exceptionHandling(ex -> ex
                        .defaultAuthenticationEntryPointFor(
                                new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED),
                                new AntPathRequestMatcher("/api/**")
                        )
                );

        return http.build();
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();

        // Must be explicit origin — wildcard (*) not allowed with credentials
        config.setAllowedOrigins(List.of(frontendUrl));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of(
                "Content-Type",
                "Accept",
                "Origin",
                "X-Requested-With",
                "Access-Control-Request-Method",
                "Access-Control-Request-Headers"
        ));
        config.setAllowCredentials(true);  // required for cookies cross-origin
        config.setExposedHeaders(List.of("Set-Cookie")); // so browser sees cookie headers
        config.setMaxAge(3600L);           // cache preflight OPTIONS for 1 hour

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }



    @Bean
    AuthenticationSuccessHandler oAuthSuccessHandler(@Value("${frontend.url}") String frontendUrl,
                                                     JwtService jwtService,
                                                     CookieService cookieService) {
        return new OAuthSuccessHandler(frontendUrl, jwtService, cookieService);
    }
}