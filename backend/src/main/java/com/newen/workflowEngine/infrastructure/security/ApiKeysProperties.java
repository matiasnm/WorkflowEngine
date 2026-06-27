package com.newen.workflowEngine.infrastructure.security;

import java.util.List;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Binds {@code workflow.security.api-keys} from {@code application.yml}.
 * <p>
 * A list of valid API keys. If the list is empty, all requests are rejected
 * (fail-closed semantics).
 */
@ConfigurationProperties(prefix = "workflow.security")
public record ApiKeysProperties(List<String> apiKeys) {

}
