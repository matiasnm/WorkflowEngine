package com.newen.workflowEngine.infrastructure.security;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.provisioning.InMemoryUserDetailsManager;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

/**
 * Spring Security configuration for API-key-based authentication.
 * <p>
 * Replaces the default form-login auto-configuration with a stateless,
 * API-key-driven security model.
 */
@Configuration
@EnableWebSecurity
@EnableConfigurationProperties(ApiKeysProperties.class)
public class SecurityConfig {

    private static final String PROBLEM_DETAIL_JSON = "application/problem+json";

    /**
     * Empty {@link UserDetailsService} that prevents Spring Security from
     * auto-generating a default user with a random password.
     * <p>
     * Our authentication is entirely API-key-based via {@link ApiKeyAuthFilter},
     * so we don't need (or want) an in-memory user.
     */
    @Bean
    public UserDetailsService userDetailsService() {
        return new InMemoryUserDetailsManager();
    }

    @Bean
    public ApiKeyAuthFilter apiKeyAuthFilter(ApiKeysProperties properties) {
        return new ApiKeyAuthFilter(properties);
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http,
                                           ApiKeyAuthFilter apiKeyAuthFilter) throws Exception {
        return http
                .csrf(csrf -> csrf.disable())
                .cors(cors -> {})              // use the existing CorsConfig bean
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint(authenticationEntryPoint())
                )
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(
                                "/actuator/health",
                                "/actuator/prometheus",
                                "/swagger-ui/**",
                                "/swagger-ui.html",
                                "/api-docs/**"
                        ).permitAll()
                        .anyRequest().authenticated()
                )
                .addFilterBefore(apiKeyAuthFilter, UsernamePasswordAuthenticationFilter.class)
                .build();
    }

    /**
     * Returns a 401 response with {@code application/problem+json} body,
     * matching the format used by {@code GlobalExceptionHandler}.
     */
    private static AuthenticationEntryPoint authenticationEntryPoint() {
        return (request, response, authException) -> {
            response.setStatus(HttpStatus.UNAUTHORIZED.value());
            response.setContentType(PROBLEM_DETAIL_JSON);
            response.getWriter().write("""
                    {"type":"about:blank","title":"Unauthorized","status":401,"detail":"Missing or invalid API key"}
                    """);
        };
    }
}
