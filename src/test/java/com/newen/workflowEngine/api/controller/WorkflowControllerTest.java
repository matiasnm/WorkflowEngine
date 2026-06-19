package com.newen.workflowEngine.api.controller;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.print;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.newen.workflowEngine.api.mapper.WorkflowRequestMapper;
import com.newen.workflowEngine.application.usecase.commands.CreateWorkflowUseCase;
import com.newen.workflowEngine.application.usecase.commands.ExecuteTransitionUseCase;
import com.newen.workflowEngine.application.usecase.commands.StartWorkflowExecutionUseCase;
import com.newen.workflowEngine.application.usecase.commands.dto.ExecuteTransitionResult;
import com.newen.workflowEngine.application.usecase.queries.GetHistoryUseCase;
import com.newen.workflowEngine.application.usecase.queries.GetNextStatesUseCase;
import com.newen.workflowEngine.domain.event.StateChanged;
import com.newen.workflowEngine.domain.model.execution.WorkflowExecution;
import com.newen.workflowEngine.domain.model.execution.WorkflowExecutionId;
import com.newen.workflowEngine.domain.model.workflow.State;
import com.newen.workflowEngine.domain.model.workflow.Transition;
import com.newen.workflowEngine.domain.model.workflow.Workflow;
import com.newen.workflowEngine.domain.model.workflow.WorkflowId;

@WebMvcTest(WorkflowController.class)
class WorkflowControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private StartWorkflowExecutionUseCase startUseCase;

    @MockitoBean
    private ExecuteTransitionUseCase executeUseCase;

    @MockitoBean
    private GetNextStatesUseCase nextStatesUseCase;

    @MockitoBean
    private GetHistoryUseCase historyUseCase;

    @MockitoBean
    private CreateWorkflowUseCase createUseCase;

    @MockitoBean
    private WorkflowRequestMapper workflowMapper;


    @Test
    void should_create_workflow() throws Exception {
        // Arrange
        UUID workflowUuid = UUID.randomUUID();
        Map<String, State> statesByCode = Map.of(
                "created", new State("created", "CREATED", false),
                "review", new State("review", "REVIEW", false)
        );
        List<Transition> transitions = List.of(
                new Transition(statesByCode.get("created"), statesByCode.get("review"))
        );
        Mockito.when(workflowMapper.buildStateMap(Mockito.any()))
                .thenReturn(statesByCode);
        Mockito.when(workflowMapper.buildTransitions(Mockito.any(), Mockito.any()))
                .thenReturn(transitions);
        Workflow workflow = new Workflow(
                new WorkflowId(workflowUuid),
                "test-workflow",
                List.copyOf(statesByCode.values()),
                transitions,
                statesByCode.get("created")
        );
        Mockito.when(
                createUseCase.execute(
                        Mockito.anyString(),
                        Mockito.anyList(),
                        Mockito.anyList(),
                        Mockito.any(State.class)
                )
        ).thenReturn(workflow);
        String requestBody = """
                {
                    "name": "test-workflow",
                    "states": [
                        {"code": "created", "name": "CREATED", "terminal": false},
                        {"code": "review", "name": "REVIEW", "terminal": false}
                    ],
                    "transitions": [
                        {"from": "created", "to": "review"}
                    ],
                    "initialState": "created"
                }
                """;
        // Act & Assert
        mockMvc.perform(
                post("/workflows")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody)
        )
        .andDo(print())
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.workflowId").value(workflowUuid.toString()));
        // Verify use case was called with expected arguments
        ArgumentCaptor<String> nameCaptor = ArgumentCaptor.forClass(String.class);
        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<State>> statesCaptor = ArgumentCaptor.forClass(List.class);
        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<Transition>> transitionsCaptor = ArgumentCaptor.forClass(List.class);
        ArgumentCaptor<State> initialStateCaptor = ArgumentCaptor.forClass(State.class);
        Mockito.verify(createUseCase).execute(
                nameCaptor.capture(),
                statesCaptor.capture(),
                transitionsCaptor.capture(),
                initialStateCaptor.capture()
        );
        assertEquals("test-workflow", nameCaptor.getValue());
        assertEquals(2, statesCaptor.getValue().size());
        assertTrue(statesCaptor.getValue().contains(new State("created", "CREATED", false)));
        assertTrue(statesCaptor.getValue().contains(new State("review", "REVIEW", false)));
        assertEquals(1, transitionsCaptor.getValue().size());
        assertEquals("CREATED", initialStateCaptor.getValue().name());
        assertEquals(false, initialStateCaptor.getValue().terminal());
    }

    @Test
    void should_start_workflow_execution() throws Exception {

        UUID workflowUuid = UUID.randomUUID();

        WorkflowExecution execution = new WorkflowExecution(
                new WorkflowExecutionId(UUID.randomUUID()),
                new WorkflowId(workflowUuid),
                new State("created", "CREATED", false)
        );

        Mockito.when(
                startUseCase.execute(Mockito.any(WorkflowId.class))
        ).thenReturn(execution);

        mockMvc.perform(
                post("/workflows/{workflowId}/executions", workflowUuid)
        )
        .andDo(print())
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.executionId").exists());

        ArgumentCaptor<WorkflowId> captor =
                ArgumentCaptor.forClass(WorkflowId.class);

        Mockito.verify(startUseCase).execute(captor.capture());

        assertEquals(
                workflowUuid,
                captor.getValue().value()
        );
    }

    @Test
    void should_execute_transition() throws Exception {
    
        UUID executionUuid = UUID.randomUUID();
        Instant timestamp = Instant.now();
    
        ExecuteTransitionResult result =
                new ExecuteTransitionResult(
                        new WorkflowExecutionId(executionUuid),
                        new State("created", "CREATED", false),
                        new State("review", "REVIEW", false),
                        timestamp
                );
            
        Mockito.when(
                executeUseCase.execute(
                        Mockito.any(WorkflowExecutionId.class),
                        Mockito.anyString()
                )
        ).thenReturn(result);
    
        String requestBody = """
                {
                  "targetStateCode": "review"
                }
                """;
    
        MvcResult mvcResult = mockMvc.perform(
                post("/executions/{executionId}/transition", executionUuid)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody)
        )
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.executionId").value(executionUuid.toString()))
        .andExpect(jsonPath("$.previousStateCode").value("created"))
        .andExpect(jsonPath("$.previousStateName").value("CREATED"))
        .andExpect(jsonPath("$.currentStateCode").value("review"))
        .andExpect(jsonPath("$.currentStateName").value("REVIEW"))
        .andExpect(jsonPath("$.timestamp").exists())
        .andReturn();

        System.out.println(mvcResult.getResolvedException());
    
        ArgumentCaptor<WorkflowExecutionId> executionCaptor =
                ArgumentCaptor.forClass(WorkflowExecutionId.class);
    
        ArgumentCaptor<String> stateCaptor =
                ArgumentCaptor.forClass(String.class);
    
        Mockito.verify(executeUseCase).execute(
                executionCaptor.capture(),
                stateCaptor.capture()
        );
    
        assertEquals(
                executionUuid,
                executionCaptor.getValue().value()
        );
    
        assertEquals(
                "review",
                stateCaptor.getValue()
        );
    }

    @Test
    void should_return_next_states() throws Exception {
    
        UUID executionId = UUID.randomUUID();
    
        List<State> states = List.of(
                new State("review", "REVIEW", false),
                new State("approved", "APPROVED", true)
        );
    
        Mockito.when(
                nextStatesUseCase.execute(Mockito.any(WorkflowExecutionId.class))
        ).thenReturn(states);
    
        mockMvc.perform(
                get("/executions/{executionId}/next-states", executionId)
        )
        .andDo(print())
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.length()").value(2))
        .andExpect(jsonPath("$[0].code").value("review"))
        .andExpect(jsonPath("$[0].name").value("REVIEW"))
        .andExpect(jsonPath("$[1].code").value("approved"))
        .andExpect(jsonPath("$[1].name").value("APPROVED"));
    
        ArgumentCaptor<WorkflowExecutionId> captor =
                ArgumentCaptor.forClass(WorkflowExecutionId.class);
    
        Mockito.verify(nextStatesUseCase).execute(captor.capture());
    
        assertEquals(executionId, captor.getValue().value());
    }

    @Test
    void should_return_execution_history() throws Exception {

        UUID executionId = UUID.randomUUID();

        List<StateChanged> history = List.of(
                new StateChanged(
                        new WorkflowExecutionId(executionId),
                        new State("created", "CREATED", false),
                        new State("review", "REVIEW", false),
                        Instant.parse("2026-06-06T10:00:00Z")
                ),
                new StateChanged(
                        new WorkflowExecutionId(executionId),
                        new State("review", "REVIEW", false),
                        new State("approved", "APPROVED", true),
                        Instant.parse("2026-06-06T11:00:00Z")
                )
        );

        Mockito.when(
                historyUseCase.execute(Mockito.any(WorkflowExecutionId.class))
        ).thenReturn(history);

        mockMvc.perform(
                get("/executions/{executionId}/history", executionId)
        )
        .andDo(print())
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.length()").value(2))
        .andExpect(jsonPath("$[0].fromStateCode").value("created"))
        .andExpect(jsonPath("$[0].fromStateName").value("CREATED"))
        .andExpect(jsonPath("$[0].toStateCode").value("review"))
        .andExpect(jsonPath("$[0].toStateName").value("REVIEW"))
        .andExpect(jsonPath("$[1].fromStateCode").value("review"))
        .andExpect(jsonPath("$[1].fromStateName").value("REVIEW"))
        .andExpect(jsonPath("$[1].toStateCode").value("approved"))
        .andExpect(jsonPath("$[1].toStateName").value("APPROVED"));

        ArgumentCaptor<WorkflowExecutionId> captor =
                ArgumentCaptor.forClass(WorkflowExecutionId.class);

        Mockito.verify(historyUseCase).execute(captor.capture());

        assertEquals(executionId, captor.getValue().value());
    }
    

}