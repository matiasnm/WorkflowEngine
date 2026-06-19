package com.newen.workflowEngine.api.controller;

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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.print;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.newen.workflowEngine.api.mapper.WorkflowRequestMapper;
import com.newen.workflowEngine.api.mapper.WorkflowResponseMapper;
import com.newen.workflowEngine.application.usecase.commands.CreateWorkflowUseCase;
import com.newen.workflowEngine.application.usecase.queries.GetWorkflowUseCase;
import com.newen.workflowEngine.application.usecase.queries.ListWorkflowsUseCase;
import com.newen.workflowEngine.domain.model.workflow.State;
import com.newen.workflowEngine.domain.model.workflow.Transition;
import com.newen.workflowEngine.domain.model.workflow.Workflow;
import com.newen.workflowEngine.domain.model.workflow.WorkflowId;

@WebMvcTest(WorkflowController.class)
class WorkflowControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private CreateWorkflowUseCase createUseCase;

    @MockitoBean
    private ListWorkflowsUseCase listWorkflowsUseCase;

    @MockitoBean
    private GetWorkflowUseCase getWorkflowUseCase;

    @MockitoBean
    private WorkflowRequestMapper workflowRequestMapper;

    @MockitoBean
    private WorkflowResponseMapper workflowResponseMapper;

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
        Mockito.when(workflowRequestMapper.buildStateMap(Mockito.any()))
                .thenReturn(statesByCode);
        Mockito.when(workflowRequestMapper.buildTransitions(Mockito.any(), Mockito.any()))
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
}
