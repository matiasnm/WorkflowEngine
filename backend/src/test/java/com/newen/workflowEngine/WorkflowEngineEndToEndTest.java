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
              "code": "created",
              "name": "CREATED",
              "terminal": false
            },
            {
              "code": "review",
              "name": "REVIEW",
              "terminal": false
            },
            {
              "code": "approved",
              "name": "APPROVED",
              "terminal": true
            }
          ],
          "transitions": [
            {
              "from": "created",
              "to": "review"
            },
            {
              "from": "review",
              "to": "approved"
            }
          ],
          "initialState": "created"
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
          "targetStateCode": "review"
        }
        """;

        mockMvc.perform(
                post("/executions/{executionId}/transition",
                        executionId)
                        .contentType("application/json")
                        .content(transitionJson)
        )
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.previousStateCode")
                .value("created"))
        .andExpect(jsonPath("$.previousStateName")
                .value("CREATED"))
        .andExpect(jsonPath("$.currentStateCode")
                .value("review"))
        .andExpect(jsonPath("$.currentStateName")
                .value("REVIEW"));

        // HISTORY

        mockMvc.perform(
                get("/executions/{executionId}/history",
                        executionId)
        )
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.length()").value(1))
        .andExpect(jsonPath("$[0].fromStateCode")
                .value("created"))
        .andExpect(jsonPath("$[0].fromStateName")
                .value("CREATED"))
        .andExpect(jsonPath("$[0].toStateCode")
                .value("review"))
        .andExpect(jsonPath("$[0].toStateName")
                .value("REVIEW"));
    }
}