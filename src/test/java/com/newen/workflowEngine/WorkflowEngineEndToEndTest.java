package com.newen.workflowEngine;

import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;


@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("jpa")
class WorkflowEngineEndToEndTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JsonMapper objectMapper;

    @Test
    void should_execute_complete_workflow_lifecycle() throws Exception {

        String workflowJson = """
        {
          "name": "Admission Workflow",
          "states": [
            {
              "name": "CREATED",
              "terminal": false
            },
            {
              "name": "REVIEW",
              "terminal": false
            },
            {
              "name": "APPROVED",
              "terminal": true
            }
          ],
          "transitions": [
            {
              "from": "CREATED",
              "to": "REVIEW"
            },
            {
              "from": "REVIEW",
              "to": "APPROVED"
            }
          ],
          "initialState": "CREATED"
        }
        """;

        // CREATE WORKFLOW

        MvcResult workflowResult =
                mockMvc.perform(
                        post("/workflows")
                                .contentType("application/json")
                                .content(workflowJson)
                )
                .andExpect(status().isOk())
                .andReturn();

        JsonNode workflowResponse =
                objectMapper.readTree(
                        workflowResult.getResponse().getContentAsString()
                );

        UUID workflowId =
                UUID.fromString(
                        workflowResponse.get("workflowId").asString()
                );

        // CREATE EXECUTION

        MvcResult executionResult =
                mockMvc.perform(
                        post("/workflows/{workflowId}/executions",
                                workflowId)
                )
                .andExpect(status().isOk())
                .andReturn();

        JsonNode executionResponse =
                objectMapper.readTree(
                        executionResult.getResponse().getContentAsString()
                );

        UUID executionId =
                UUID.fromString(
                        executionResponse.get("executionId").asString()
                );

        // TRANSITION

        String transitionJson = """
        {
          "targetState": {
            "name": "REVIEW",
            "terminal": false
          }
        }
        """;

        mockMvc.perform(
                post("/executions/{executionId}/transition",
                        executionId)
                        .contentType("application/json")
                        .content(transitionJson)
        )
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.previousState")
                .value("CREATED"))
        .andExpect(jsonPath("$.currentState")
                .value("REVIEW"));

        // HISTORY

        mockMvc.perform(
                get("/executions/{executionId}/history",
                        executionId)
        )
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.length()").value(1))
        .andExpect(jsonPath("$[0].fromState")
                .value("CREATED"))
        .andExpect(jsonPath("$[0].toState")
                .value("REVIEW"));
    }
}