package com.newen.workflowEngine.infrastructure.security;

import java.util.List;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;

import jakarta.servlet.http.HttpServletResponse;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ApiKeyAuthFilterTest {

    private static final String VALID_KEY = "sk-test-valid";

    private final ApiKeyAuthFilter filter = new ApiKeyAuthFilter(
            new ApiKeysProperties(List.of(VALID_KEY))
    );

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void validKey_shouldSetSecurityContextAndContinueChain() throws Exception {
        var request = new MockHttpServletRequest();
        request.addHeader("X-API-Key", VALID_KEY);
        var response = new MockHttpServletResponse();
        var chain = new MockFilterChain();

        filter.doFilter(request, response, chain);

        assertEquals(HttpServletResponse.SC_OK, response.getStatus());
        assertNotNull(SecurityContextHolder.getContext().getAuthentication());
        assertTrue(SecurityContextHolder.getContext().getAuthentication() instanceof ApiKeyAuthentication);
        assertEquals(VALID_KEY, SecurityContextHolder.getContext().getAuthentication().getCredentials());
    }

    @Test
    void missingHeader_shouldContinueChainWithoutAuthentication() throws Exception {
        var request = new MockHttpServletRequest();
        var response = new MockHttpServletResponse();
        var chain = new MockFilterChain();

        filter.doFilter(request, response, chain);

        assertEquals(HttpServletResponse.SC_OK, response.getStatus());
        assertNull(SecurityContextHolder.getContext().getAuthentication());
    }

    @Test
    void wrongKey_shouldContinueChainWithoutAuthentication() throws Exception {
        var request = new MockHttpServletRequest();
        request.addHeader("X-API-Key", "sk-wrong-key");
        var response = new MockHttpServletResponse();
        var chain = new MockFilterChain();

        filter.doFilter(request, response, chain);

        assertEquals(HttpServletResponse.SC_OK, response.getStatus());
        assertNull(SecurityContextHolder.getContext().getAuthentication());
    }

    @Test
    void blankConfiguredKey_shouldNotBeTreatedAsValid() throws Exception {
        var filterWithBlankKey = new ApiKeyAuthFilter(
                new ApiKeysProperties(List.of("  "))
        );
        var request = new MockHttpServletRequest();
        request.addHeader("X-API-Key", "  ");
        var response = new MockHttpServletResponse();
        var chain = new MockFilterChain();

        filterWithBlankKey.doFilter(request, response, chain);

        assertEquals(HttpServletResponse.SC_OK, response.getStatus());
        assertNull(SecurityContextHolder.getContext().getAuthentication());
    }

    @Test
    void emptyKeyList_shouldNeverSetAuthentication() throws Exception {
        var filterWithEmptyKeys = new ApiKeyAuthFilter(
                new ApiKeysProperties(List.of())
        );
        var request = new MockHttpServletRequest();
        request.addHeader("X-API-Key", "sk-anything");
        var response = new MockHttpServletResponse();
        var chain = new MockFilterChain();

        filterWithEmptyKeys.doFilter(request, response, chain);

        assertEquals(HttpServletResponse.SC_OK, response.getStatus());
        assertNull(SecurityContextHolder.getContext().getAuthentication());
    }
}
