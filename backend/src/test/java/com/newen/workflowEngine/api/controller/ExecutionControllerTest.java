package com.newen.workflowEngine.api.controller;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.print;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.newen.workflowEngine.api.dto.ExecutionResponse;
import com.newen.workflowEngine.api.dto.StateResponse;
import com.newen.workflowEngine.api.mapper.ExecutionResponseMapper;
import com.newen.workflowEngine.application.usecase.commands.DeleteExecutionUseCase;
import com.newen.workflowEngine.application.usecase.commands.ExecuteTransitionUseCase;
import com.newen.workflowEngine.application.usecase.commands.StartWorkflowExecutionUseCase;
import com.newen.workflowEngine.application.usecase.commands.dto.ExecuteTransitionResult;
import com.newen.workflowEngine.application.usecase.queries.GetExecutionUseCase;
import com.newen.workflowEngine.application.usecase.queries.GetHistoryUseCase;
import com.newen.workflowEngine.application.usecase.queries.GetNextStatesUseCase;
import com.newen.workflowEngine.application.usecase.queries.ListExecutionsUseCase;
import com.newen.workflowEngine.domain.event.StateChanged;
import com.newen.workflowEngine.domain.model.execution.WorkflowExecution;
import com.newen.workflowEngine.domain.model.execution.WorkflowExecutionId;
import com.newen.workflowEngine.domain.model.workflow.State;
import com.newen.workflowEngine.domain.model.workflow.WorkflowId;

@WebMvcTest(ExecutionController.class)
class ExecutionControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private StartWorkflowExecutionUseCase startUseCase;

    @MockitoBean
    private ExecuteTransitionUseCase transitionUseCase;

    @MockitoBean
    private GetNextStatesUseCase nextStatesUseCase;

    @MockitoBean
    private GetHistoryUseCase historyUseCase;

    @MockitoBean
    private GetExecutionUseCase getExecutionUseCase;

    @MockitoBean
    private ListExecutionsUseCase listExecutionsUseCase;

    @MockitoBean
    private ExecutionResponseMapper executionResponseMapper;

    @MockitoBean
    private DeleteExecutionUseCase deleteExecutionUseCase;


    @Test
    void should_start_execution() throws Exception {
        // Arrange
        UUID workflowId = UUID.randomUUID();
        UUID executionId = UUID.randomUUID();
        WorkflowExecution execution = new WorkflowExecution(
                new WorkflowExecutionId(executionId),
                new WorkflowId(workflowId),
                new State("created", "CREATED", false)
        );
        when(startUseCase.execute(any(WorkflowId.class), any())).thenReturn(execution);

        // Act & Assert
        mockMvc.perform(
                post("/workflows/{workflowId}/executions", workflowId)
        )
        .andDo(print())
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.executionId").value(executionId.toString()));
    }

    @Test
    void should_start_execution_with_context() throws Exception {
        // Arrange
        UUID workflowId = UUID.randomUUID();
        UUID executionId = UUID.randomUUID();
        Map<String, Object> context = Map.of("orderId", "ORD-123", "amount", 4500);
        WorkflowExecution execution = new WorkflowExecution(
                new WorkflowExecutionId(executionId),
                new WorkflowId(workflowId),
                new State("created", "CREATED", false),
                context
        );
        when(startUseCase.execute(any(WorkflowId.class), any())).thenReturn(execution);

        String requestBody = """
                {
                    "context": {
                        "orderId": "ORD-123",
                        "amount": 4500
                    }
                }
                """;

        // Act & Assert
        mockMvc.perform(
                post("/workflows/{workflowId}/executions", workflowId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody)
        )
        .andDo(print())
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.executionId").value(executionId.toString()));
    }


    @Test
    void should_list_executions() throws Exception {
        // Arrange
        UUID workflowId = UUID.randomUUID();
        UUID executionId = UUID.randomUUID();
        Instant now = Instant.now();
        List<WorkflowExecution> executions = List.of(
                new WorkflowExecution(
                        new WorkflowExecutionId(executionId),
                        new WorkflowId(workflowId),
                        new State("created", "CREATED", false)
                )
        );
        ExecutionResponse mockResponse = new ExecutionResponse(
                executionId,
                workflowId,
                new StateResponse("created", "CREATED", false),
                now,
                null
        );

        when(listExecutionsUseCase.execute(any(WorkflowId.class), anyInt(), anyInt())).thenReturn(executions);
        when(listExecutionsUseCase.count(any(WorkflowId.class))).thenReturn(1);
        when(executionResponseMapper.toExecutionResponse(any(WorkflowExecution.class)))
                .thenReturn(mockResponse);

        // Act & Assert
        mockMvc.perform(
                get("/workflows/{workflowId}/executions", workflowId)
        )
        .andDo(print())
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.content[0].id").value(executionId.toString()))
        .andExpect(jsonPath("$.content[0].workflowId").value(workflowId.toString()))
        .andExpect(jsonPath("$.content[0].currentState.code").value("created"))
        .andExpect(jsonPath("$.content[0].currentStateSince").isNotEmpty())
        .andExpect(jsonPath("$.page").value(0))
        .andExpect(jsonPath("$.size").value(20))
        .andExpect(jsonPath("$.totalElements").value(1))
        .andExpect(jsonPath("$.totalPages").value(1));
    }


    @Test
    void should_get_execution() throws Exception {
        // Arrange
        UUID workflowId = UUID.randomUUID();
        UUID executionId = UUID.randomUUID();
        State currentState = new State("in_review", "IN_REVIEW", false);
        WorkflowExecution execution = new WorkflowExecution(
                new WorkflowExecutionId(executionId),
                new WorkflowId(workflowId),
                currentState
        );
        ExecutionResponse mockResponse = new ExecutionResponse(
                executionId,
                workflowId,
                new StateResponse(currentState.code(), currentState.name(), currentState.terminal()),
                null,
                null
        );

        when(getExecutionUseCase.execute(any(WorkflowExecutionId.class))).thenReturn(execution);
        when(executionResponseMapper.toExecutionResponse(execution)).thenReturn(mockResponse);

        // Act & Assert
        mockMvc.perform(
                get("/executions/{executionId}", executionId)
        )
        .andDo(print())
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.id").value(executionId.toString()))
        .andExpect(jsonPath("$.workflowId").value(workflowId.toString()))
        .andExpect(jsonPath("$.currentState.code").value("in_review"))
        .andExpect(jsonPath("$.currentState.name").value("IN_REVIEW"))
        .andExpect(jsonPath("$.currentState.terminal").value(false));
    }


    @Test
    void should_get_next_states() throws Exception {
        // Arrange
        UUID executionId = UUID.randomUUID();
        List<State> nextStates = List.of(
                new State("approve", "APPROVE", false),
                new State("reject", "REJECT", true)
        );
        when(nextStatesUseCase.execute(any(WorkflowExecutionId.class))).thenReturn(nextStates);

        // Act & Assert
        mockMvc.perform(
                get("/executions/{executionId}/next-states", executionId)
        )
        .andDo(print())
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].code").value("approve"))
        .andExpect(jsonPath("$[0].name").value("APPROVE"))
        .andExpect(jsonPath("$[1].code").value("reject"))
        .andExpect(jsonPath("$[1].name").value("REJECT"));
    }


    @Test
    void should_get_history() throws Exception {
        // Arrange
        UUID executionId = UUID.randomUUID();
        WorkflowExecutionId wfExecId = new WorkflowExecutionId(executionId);
        Instant now = Instant.now();
        State stateCreated = new State("created", "CREATED", false);
        State stateReview = new State("review", "REVIEW", false);
        List<StateChanged> history = List.of(
                new StateChanged(wfExecId, new WorkflowId(UUID.randomUUID()), stateCreated, stateReview, now)
        );
        when(historyUseCase.execute(any(WorkflowExecutionId.class))).thenReturn(history);

        // Act & Assert
        mockMvc.perform(
                get("/executions/{executionId}/history", executionId)
        )
        .andDo(print())
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].fromStateCode").value("created"))
        .andExpect(jsonPath("$[0].fromStateName").value("CREATED"))
        .andExpect(jsonPath("$[0].toStateCode").value("review"))
        .andExpect(jsonPath("$[0].toStateName").value("REVIEW"))
        .andExpect(jsonPath("$[0].timestamp").isNotEmpty());
    }


    @Test
    void should_execute_transition() throws Exception {
        // Arrange
        UUID executionId = UUID.randomUUID();
        WorkflowExecutionId wfExecId = new WorkflowExecutionId(executionId);
        Instant now = Instant.now();
        State prevState = new State("created", "CREATED", false);
        State nextState = new State("review", "REVIEW", false);
        ExecuteTransitionResult result = new ExecuteTransitionResult(
                wfExecId,
                prevState,
                nextState,
                now
        );
        when(transitionUseCase.execute(any(WorkflowExecutionId.class), eq("review")))
                .thenReturn(result);

        String requestBody = """
                {
                    "targetStateCode": "review"
                }
                """;

        // Act & Assert
        mockMvc.perform(
                post("/executions/{executionId}/transition", executionId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody)
        )
        .andDo(print())
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.executionId").value(executionId.toString()))
        .andExpect(jsonPath("$.previousStateCode").value("created"))
        .andExpect(jsonPath("$.previousStateName").value("CREATED"))
        .andExpect(jsonPath("$.currentStateCode").value("review"))
        .andExpect(jsonPath("$.currentStateName").value("REVIEW"))
        .andExpect(jsonPath("$.timestamp").isNotEmpty());
    }
}
