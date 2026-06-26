package com.newen.workflowEngine;

import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
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

    @Test
    void should_start_execution_with_context() throws Exception {

        String workflowJson = """
        {
          "name": "Context Test Workflow",
          "states": [
            {
              "code": "created",
              "name": "CREATED",
              "terminal": false
            },
            {
              "code": "done",
              "name": "DONE",
              "terminal": true
            }
          ],
          "transitions": [
            {
              "from": "created",
              "to": "done"
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

        UUID workflowId = UUID.fromString(
                objectMapper.readTree(workflowResult.getResponse().getContentAsString())
                        .get("workflowId").asString()
        );

        // START EXECUTION WITH CONTEXT
        String startRequest = """
        {
          "context": {
            "orderId": "ORD-123",
            "amount": 4500,
            "customer": "acme-corp"
          }
        }
        """;

        MvcResult executionResult =
                mockMvc.perform(
                        post("/workflows/{workflowId}/executions", workflowId)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(startRequest)
                )
                .andExpect(status().isOk())
                .andReturn();

        UUID executionId = UUID.fromString(
                objectMapper.readTree(executionResult.getResponse().getContentAsString())
                        .get("executionId").asString()
        );

        // GET EXECUTION AND VERIFY CONTEXT
        mockMvc.perform(
                get("/executions/{executionId}", executionId)
        )
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.context.orderId").value("ORD-123"))
        .andExpect(jsonPath("$.context.amount").value(4500))
        .andExpect(jsonPath("$.context.customer").value("acme-corp"));

        // LIST EXECUTIONS AND VERIFY CONTEXT IN LIST
        mockMvc.perform(
                get("/workflows/{workflowId}/executions", workflowId)
        )
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.content[0].context.orderId").value("ORD-123"))
        .andExpect(jsonPath("$.content[0].context.amount").value(4500));
    }
}