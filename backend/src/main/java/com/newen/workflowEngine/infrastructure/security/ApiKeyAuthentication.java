package com.newen.workflowEngine.infrastructure.security;

import java.util.List;

import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

/**
 * Minimal {@link org.springframework.security.core.Authentication} token for
 * API-key-authenticated requests.
 * <p>
 * All valid API keys receive the {@code ROLE_API} authority. This can be used
 * later for method-level security if needed.
 */
public class ApiKeyAuthentication extends AbstractAuthenticationToken {

    private final String key;

    public ApiKeyAuthentication(String key) {
        super(List.of(new SimpleGrantedAuthority("ROLE_API")));
        this.key = key;
        setAuthenticated(true);
    }

    @Override
    public Object getCredentials() {
        return key;
    }

    @Override
    public Object getPrincipal() {
        return "api-key";
    }
}
