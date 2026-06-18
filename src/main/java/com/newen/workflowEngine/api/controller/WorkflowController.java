package com.newen.workflowEngine.api.controller;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.newen.workflowEngine.api.dto.CreateWorkflowRequest;
import com.newen.workflowEngine.api.dto.CreateWorkflowResponse;
import com.newen.workflowEngine.api.dto.HistoryItemResponse;
import com.newen.workflowEngine.api.dto.NextStatesResponse;
import com.newen.workflowEngine.api.dto.TransitionRequest;
import com.newen.workflowEngine.api.dto.TransitionResponse;
import com.newen.workflowEngine.api.dto.WorkflowExecutionCreatedResponse;
import com.newen.workflowEngine.api.mapper.WorkflowRequestMapper;
import com.newen.workflowEngine.application.usecase.commands.CreateWorkflowUseCase;
import com.newen.workflowEngine.application.usecase.commands.ExecuteTransitionUseCase;
import com.newen.workflowEngine.application.usecase.commands.StartWorkflowExecutionUseCase;
import com.newen.workflowEngine.application.usecase.commands.dto.ExecuteTransitionResult;
import com.newen.workflowEngine.application.usecase.queries.GetHistoryUseCase;
import com.newen.workflowEngine.application.usecase.queries.GetNextStatesUseCase;
import com.newen.workflowEngine.domain.event.StateChanged;
import com.newen.workflowEngine.domain.model.execution.WorkflowExecutionId;
import com.newen.workflowEngine.domain.model.workflow.State;
import com.newen.workflowEngine.domain.model.workflow.Transition;
import com.newen.workflowEngine.domain.model.workflow.Workflow;
import com.newen.workflowEngine.domain.model.workflow.WorkflowId;

@RestController
@RequestMapping
public class WorkflowController {

    private final StartWorkflowExecutionUseCase startUseCase;
    private final ExecuteTransitionUseCase transitionUseCase;
    private final GetNextStatesUseCase nextStatesUseCase;
    private final GetHistoryUseCase historyUseCase;
    private final CreateWorkflowUseCase createUseCase;
    private final WorkflowRequestMapper workflowMapper;

    public WorkflowController(
            StartWorkflowExecutionUseCase startUseCase,
            ExecuteTransitionUseCase transitionUseCase,
            GetNextStatesUseCase nextStatesUseCase,
            GetHistoryUseCase historyUseCase,
            CreateWorkflowUseCase createUseCase,
            WorkflowRequestMapper workflowMapper 
    ) {
        this.startUseCase = startUseCase;
        this.transitionUseCase = transitionUseCase;
        this.nextStatesUseCase = nextStatesUseCase;
        this.historyUseCase = historyUseCase;
        this.createUseCase = createUseCase;
        this.workflowMapper = workflowMapper; 
    }

    @PostMapping("/workflows")
    public CreateWorkflowResponse create(@RequestBody CreateWorkflowRequest request) {
        Map<String, State> statesByName = workflowMapper.buildStateMap(request);
        List<Transition> transitions = workflowMapper.buildTransitions(request, statesByName);
        Workflow workflow = createUseCase.execute(
                request.name(),
                List.copyOf(statesByName.values()),
                transitions,
                statesByName.get(request.initialState())
        );
        return new CreateWorkflowResponse(workflow.getId().value());
    }

    
    @PostMapping("/workflows/{workflowId}/executions")
    public WorkflowExecutionCreatedResponse start(
            @PathVariable("workflowId") UUID workflowId
    ) {
        return new WorkflowExecutionCreatedResponse(
            startUseCase.execute(new WorkflowId(workflowId)).getId().value()
        );
    }


    @PostMapping("/executions/{executionId}/transition")
    public TransitionResponse transition(
            @PathVariable("executionId") UUID executionId,
            @RequestBody TransitionRequest request
    ) {
        ExecuteTransitionResult result = transitionUseCase.execute(
            new WorkflowExecutionId(executionId), 
            request.targetState()
        );

        return new TransitionResponse(
            result.executionId().value(),
            result.previousState().name(),
            result.currentState().name(),
            result.timestamp()
        );
    }


    @GetMapping("/executions/{executionId}/next-states")
    public List<NextStatesResponse> nextStates(
            @PathVariable("executionId") UUID executionId
    ) {
        List<State> statesList =  nextStatesUseCase.execute(new WorkflowExecutionId(executionId));
        List<NextStatesResponse> list = statesList.stream()
            .map(state -> new NextStatesResponse(state.name()))
            .toList();
        return list;
    }


    @GetMapping("/executions/{executionId}/history")
    public List<HistoryItemResponse> history(
            @PathVariable("executionId") UUID executionId
    ) {
        List<StateChanged> stateChanges = historyUseCase.execute(new WorkflowExecutionId(executionId));
        return stateChanges.stream()
            .map(change -> new HistoryItemResponse(
                change.getFrom().name(),
                change.getTo().name(),
                change.getTimestamp()))
            .toList();
    }
}