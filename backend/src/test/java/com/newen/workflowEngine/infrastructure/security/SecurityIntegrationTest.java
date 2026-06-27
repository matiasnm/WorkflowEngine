package com.newen.workflowEngine.infrastructure.security;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Integration tests that verify the API-key authentication behaviour
 * end-to-end (with the real security filter chain).
 */
@SpringBootTest(properties = {
    "workflow.security.api-keys[0]=sk-test-integration-key"
})
@AutoConfigureMockMvc
@ActiveProfiles("h2")
class SecurityIntegrationTest {

    private static final String VALID_API_KEY = "sk-test-integration-key";

    @Autowired
    private MockMvc mockMvc;

    // -- Authenticated endpoints ----------------------------------------------

    @Test
    void requestWithoutKey_shouldReturn401() throws Exception {
        mockMvc.perform(get("/workflows"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void requestWithWrongKey_shouldReturn401() throws Exception {
        mockMvc.perform(get("/workflows")
                        .header("X-API-Key", "sk-wrong"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void requestWithValidKey_shouldReturn200() throws Exception {
        mockMvc.perform(get("/workflows")
                        .header("X-API-Key", VALID_API_KEY))
                .andExpect(status().isOk());
    }

    @Test
    void requestWithValidKey_shouldReturn200_forExecutionEndpoint() throws Exception {
        mockMvc.perform(get("/workflows")
                        .header("X-API-Key", VALID_API_KEY))
                .andExpect(status().isOk());
    }

    // -- Excluded paths (no key required) ------------------------------------

    @Test
    void actuatorHealth_withoutKey_shouldReturn200() throws Exception {
        mockMvc.perform(get("/actuator/health"))
                .andExpect(status().isOk());
    }

    @Test
    void actuatorPrometheus_withoutKey_shouldReturn200() throws Exception {
        mockMvc.perform(get("/actuator/prometheus"))
                .andExpect(status().isOk());
    }

    @Test
    void swaggerUi_withoutKey_shouldBeAccessible() throws Exception {
        // /swagger-ui.html redirects to /swagger-ui/index.html — the
        // important assertion is that it doesn't return 401.
        mockMvc.perform(get("/swagger-ui.html"))
                .andExpect(status().is3xxRedirection());
    }

    @Test
    void swaggerUiIndex_withoutKey_shouldReturn200() throws Exception {
        mockMvc.perform(get("/swagger-ui/index.html"))
                .andExpect(status().isOk());
    }

    @Test
    void apiDocs_withoutKey_shouldReturn200() throws Exception {
        mockMvc.perform(get("/api-docs"))
                .andExpect(status().isOk());
    }
}
