package com.newen.workflowEngine.api.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import com.newen.workflowEngine.api.dto.ExecutionResponse;
import com.newen.workflowEngine.api.dto.HistoryItemResponse;
import com.newen.workflowEngine.api.dto.NextStatesResponse;
import com.newen.workflowEngine.api.dto.TransitionRequest;
import com.newen.workflowEngine.api.dto.TransitionResponse;
import com.newen.workflowEngine.api.dto.WorkflowExecutionCreatedResponse;
import com.newen.workflowEngine.api.mapper.ExecutionResponseMapper;
import com.newen.workflowEngine.application.usecase.commands.ExecuteTransitionUseCase;
import com.newen.workflowEngine.application.usecase.commands.StartWorkflowExecutionUseCase;
import com.newen.workflowEngine.application.usecase.commands.dto.ExecuteTransitionResult;
import com.newen.workflowEngine.application.usecase.queries.GetExecutionUseCase;
import com.newen.workflowEngine.application.usecase.queries.GetHistoryUseCase;
import com.newen.workflowEngine.application.usecase.queries.GetNextStatesUseCase;
import com.newen.workflowEngine.domain.event.StateChanged;
import com.newen.workflowEngine.domain.model.execution.WorkflowExecutionId;
import com.newen.workflowEngine.domain.model.workflow.State;
import com.newen.workflowEngine.domain.model.workflow.WorkflowId;

import jakarta.validation.Valid;

@RestController
public class ExecutionController {

    private final StartWorkflowExecutionUseCase startUseCase;
    private final ExecuteTransitionUseCase transitionUseCase;
    private final GetNextStatesUseCase nextStatesUseCase;
    private final GetHistoryUseCase historyUseCase;
    private final GetExecutionUseCase getExecutionUseCase;
    private final ExecutionResponseMapper executionResponseMapper;

    public ExecutionController(
            StartWorkflowExecutionUseCase startUseCase,
            ExecuteTransitionUseCase transitionUseCase,
            GetNextStatesUseCase nextStatesUseCase,
            GetHistoryUseCase historyUseCase,
            GetExecutionUseCase getExecutionUseCase,
            ExecutionResponseMapper executionResponseMapper
    ) {
        this.startUseCase = startUseCase;
        this.transitionUseCase = transitionUseCase;
        this.nextStatesUseCase = nextStatesUseCase;
        this.historyUseCase = historyUseCase;
        this.getExecutionUseCase = getExecutionUseCase;
        this.executionResponseMapper = executionResponseMapper;
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
            @Valid @RequestBody TransitionRequest request
    ) {
        ExecuteTransitionResult result = transitionUseCase.execute(
            new WorkflowExecutionId(executionId),
            request.targetStateCode()
        );

        return new TransitionResponse(
            result.executionId().value(),
            result.previousState().code(),
            result.previousState().name(),
            result.currentState().code(),
            result.currentState().name(),
            result.timestamp()
        );
    }


    @GetMapping("/executions/{executionId}")
    public ExecutionResponse getExecution(@PathVariable("executionId") UUID executionId) {
        var execution = getExecutionUseCase.execute(new WorkflowExecutionId(executionId));
        return executionResponseMapper.toExecutionResponse(execution);
    }


    @GetMapping("/executions/{executionId}/next-states")
    public List<NextStatesResponse> nextStates(
            @PathVariable("executionId") UUID executionId
    ) {
        List<State> statesList = nextStatesUseCase.execute(new WorkflowExecutionId(executionId));
        return statesList.stream()
                .map(state -> new NextStatesResponse(state.code(), state.name()))
                .toList();
    }


    @GetMapping("/executions/{executionId}/history")
    public List<HistoryItemResponse> history(
            @PathVariable("executionId") UUID executionId
    ) {
        List<StateChanged> stateChanges = historyUseCase.execute(new WorkflowExecutionId(executionId));
        return stateChanges.stream()
                .map(change -> new HistoryItemResponse(
                    change.getFrom().code(),
                    change.getFrom().name(),
                    change.getTo().code(),
                    change.getTo().name(),
                    change.getTimestamp()))
                .toList();
    }
}
