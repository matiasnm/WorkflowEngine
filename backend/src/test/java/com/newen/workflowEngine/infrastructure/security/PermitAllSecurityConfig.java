package com.newen.workflowEngine.infrastructure.security;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Test configuration that disables all security for {@code @WebMvcTest} slices.
 * <p>
 * Import this class in controller unit tests so they don't need to send
 * API-key headers for every request. Security behavior is tested separately
 * in {@link SecurityIntegrationTest}.
 */
@TestConfiguration
@EnableWebSecurity
public class PermitAllSecurityConfig {

    @Bean
    public SecurityFilterChain permitAllFilterChain(HttpSecurity http) throws Exception {
        return http
                .csrf(csrf -> csrf.disable())
                .authorizeHttpRequests(auth -> auth.anyRequest().permitAll())
                .build();
    }
}
