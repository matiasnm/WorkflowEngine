package com.newen.workflowEngine.infrastructure.security;

import java.io.IOException;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.security.core.context.SecurityContextHolder;

import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletRequest;

/**
 * Servlet {@link Filter} that authenticates requests by validating the
 * {@code X-API-Key} header against the configured list of valid keys.
 * <p>
 * When a valid key is present, an {@link ApiKeyAuthentication} token is set
 * in the {@link SecurityContextHolder}. If the key is missing or invalid,
 * the request continues without authentication — the
 * {@link org.springframework.security.config.annotation.web.builders.HttpSecurity
 * authorizeHttpRequests} rules in {@link SecurityConfig} will handle
 * rejecting unauthenticated requests to protected paths.
 */
public class ApiKeyAuthFilter implements Filter {

    private static final String HEADER = "X-API-Key";

    private final Set<String> validKeys;

    public ApiKeyAuthFilter(ApiKeysProperties properties) {
        this.validKeys = properties.apiKeys().stream()
                .filter(k -> k != null && !k.isBlank())
                .collect(Collectors.toUnmodifiableSet());
    }

    @Override
    public void doFilter(ServletRequest servletRequest,
                         ServletResponse servletResponse,
                         FilterChain chain) throws IOException, ServletException {

        HttpServletRequest request = (HttpServletRequest) servletRequest;

        String key = request.getHeader(HEADER);

        if (key != null && validKeys.contains(key)) {
            SecurityContextHolder.getContext().setAuthentication(
                    new ApiKeyAuthentication(key)
            );
        }

        chain.doFilter(request, servletResponse);
    }
}
