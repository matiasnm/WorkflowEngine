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
        Map<String, State> statesByName = Map.of(
                "CREATED", new State("CREATED", false),
                "REVIEW", new State("REVIEW", false)
        );
        List<Transition> transitions = List.of(
                new Transition(statesByName.get("CREATED"), statesByName.get("REVIEW"))
        );
        Mockito.when(workflowMapper.buildStateMap(Mockito.any()))
                .thenReturn(statesByName);
        Mockito.when(workflowMapper.buildTransitions(Mockito.any(), Mockito.any()))
                .thenReturn(transitions);
        Workflow workflow = new Workflow(
                new WorkflowId(workflowUuid),
                "test-workflow",
                List.copyOf(statesByName.values()),
                transitions,
                statesByName.get("CREATED")
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
                        {"name": "CREATED", "terminal": false},
                        {"name": "REVIEW", "terminal": false}
                    ],
                    "transitions": [
                        {"from": "CREATED", "to": "REVIEW"}
                    ],
                    "initialState": "CREATED"
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
        assertTrue(statesCaptor.getValue().contains(new State("CREATED", false)));
        assertTrue(statesCaptor.getValue().contains(new State("REVIEW", false)));
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
                new State("CREATED", false)
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
                        new State("CREATED", false),
                        new State("REVIEW", false),
                        timestamp
                );
            
        Mockito.when(
                executeUseCase.execute(
                        Mockito.any(WorkflowExecutionId.class),
                        Mockito.any(State.class)
                )
        ).thenReturn(result);
    
        String requestBody = """
                {
                  "targetState": {
                    "name": "REVIEW",
                    "terminal": false
                  }
                }
                """;
    
        MvcResult mvcResult = mockMvc.perform(
                post("/executions/{executionId}/transition", executionUuid)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody)
        )
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.executionId").value(executionUuid.toString()))
        .andExpect(jsonPath("$.previousState").value("CREATED"))
        .andExpect(jsonPath("$.currentState").value("REVIEW"))
        .andExpect(jsonPath("$.timestamp").exists())
        .andReturn();

        System.out.println(mvcResult.getResolvedException());
    
        ArgumentCaptor<WorkflowExecutionId> executionCaptor =
                ArgumentCaptor.forClass(WorkflowExecutionId.class);
    
        ArgumentCaptor<State> stateCaptor =
                ArgumentCaptor.forClass(State.class);
    
        Mockito.verify(executeUseCase).execute(
                executionCaptor.capture(),
                stateCaptor.capture()
        );
    
        assertEquals(
                executionUuid,
                executionCaptor.getValue().value()
        );
    
        assertEquals(
                "REVIEW",
                stateCaptor.getValue().name()
        );
    
        assertEquals(
                false,
                stateCaptor.getValue().terminal()
        );
    }

    @Test
    void should_return_next_states() throws Exception {
    
        UUID executionId = UUID.randomUUID();
    
        List<State> states = List.of(
                new State("REVIEW", false),
                new State("APPROVED", true)
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
        .andExpect(jsonPath("$[0].states").value("REVIEW"))
        .andExpect(jsonPath("$[1].states").value("APPROVED"));
    
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
                        new State("CREATED", false),
                        new State("REVIEW", false),
                        Instant.parse("2026-06-06T10:00:00Z")
                ),
                new StateChanged(
                        new WorkflowExecutionId(executionId),
                        new State("REVIEW", false),
                        new State("APPROVED", true),
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
        .andExpect(jsonPath("$[0].fromState").value("CREATED"))
        .andExpect(jsonPath("$[0].toState").value("REVIEW"))
        .andExpect(jsonPath("$[1].fromState").value("REVIEW"))
        .andExpect(jsonPath("$[1].toState").value("APPROVED"));

        ArgumentCaptor<WorkflowExecutionId> captor =
                ArgumentCaptor.forClass(WorkflowExecutionId.class);

        Mockito.verify(historyUseCase).execute(captor.capture());

        assertEquals(executionId, captor.getValue().value());
    }
    

}