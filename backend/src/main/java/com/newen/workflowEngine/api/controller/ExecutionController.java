package com.newen.workflowEngine.api.controller;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.newen.workflowEngine.api.dto.ExecutionPageResponse;
import com.newen.workflowEngine.api.dto.ExecutionResponse;
import com.newen.workflowEngine.api.dto.HistoryItemResponse;
import com.newen.workflowEngine.api.dto.NextStatesResponse;
import com.newen.workflowEngine.api.dto.StartExecutionRequest;
import com.newen.workflowEngine.api.dto.TransitionRequest;
import com.newen.workflowEngine.api.dto.TransitionResponse;
import com.newen.workflowEngine.api.dto.WorkflowExecutionCreatedResponse;
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
import com.newen.workflowEngine.domain.model.execution.WorkflowExecutionId;
import com.newen.workflowEngine.domain.model.workflow.State;
import com.newen.workflowEngine.domain.model.workflow.WorkflowId;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

@RestController
@Validated
@Tag(name = "Executions", description = "API to manage workflow executions")
public class ExecutionController {

    private final StartWorkflowExecutionUseCase startUseCase;
    private final ExecuteTransitionUseCase transitionUseCase;
    private final GetNextStatesUseCase nextStatesUseCase;
    private final GetHistoryUseCase historyUseCase;
    private final GetExecutionUseCase getExecutionUseCase;
    private final ListExecutionsUseCase listExecutionsUseCase;
    private final ExecutionResponseMapper executionResponseMapper;
    private final DeleteExecutionUseCase deleteExecutionUseCase;

    public ExecutionController(
            StartWorkflowExecutionUseCase startUseCase,
            ExecuteTransitionUseCase transitionUseCase,
            GetNextStatesUseCase nextStatesUseCase,
            GetHistoryUseCase historyUseCase,
            GetExecutionUseCase getExecutionUseCase,
            ListExecutionsUseCase listExecutionsUseCase,
            ExecutionResponseMapper executionResponseMapper,
            DeleteExecutionUseCase deleteExecutionUseCase
    ) {
        this.startUseCase = startUseCase;
        this.transitionUseCase = transitionUseCase;
        this.nextStatesUseCase = nextStatesUseCase;
        this.historyUseCase = historyUseCase;
        this.getExecutionUseCase = getExecutionUseCase;
        this.listExecutionsUseCase = listExecutionsUseCase;
        this.executionResponseMapper = executionResponseMapper;
        this.deleteExecutionUseCase = deleteExecutionUseCase;
    }


    @PostMapping("/workflows/{workflowId}/executions")
    @Operation(summary = "Start a new execution for a workflow")
    @ApiResponse(responseCode = "200", description = "Execution started")
    @ApiResponse(responseCode = "404", description = "Workflow not found",
        content = @Content(schema = @Schema(implementation = org.springframework.http.ProblemDetail.class)))
    public WorkflowExecutionCreatedResponse start(
            @Parameter(description = "Workflow unique identifier")
            @PathVariable("workflowId") UUID workflowId,
            @RequestBody(required = false) StartExecutionRequest request
    ) {
        Map<String, Object> context = request != null ? request.context() : null;
        String callbackUrl = request != null ? request.callbackUrl() : null;
        return new WorkflowExecutionCreatedResponse(
            startUseCase.execute(new WorkflowId(workflowId), context, callbackUrl)
                .getId().value()
        );
    }


    @GetMapping("/workflows/{workflowId}/executions")
    @Operation(summary = "List all executions for a workflow")
    public ExecutionPageResponse listExecutions(
            @Parameter(description = "Workflow unique identifier")
            @PathVariable("workflowId") UUID workflowId,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Max(100) int size
    ) {
        var executions = listExecutionsUseCase.execute(new WorkflowId(workflowId), page, size);
        int total = listExecutionsUseCase.count(new WorkflowId(workflowId));
        int totalPages = (int) Math.ceil((double) total / size);

        return new ExecutionPageResponse(
            executions.stream()
                .map(executionResponseMapper::toExecutionResponse)
                .toList(),
            page,
            size,
            total,
            totalPages
        );
    }


    @PostMapping("/executions/{executionId}/transition")
    @Operation(summary = "Execute a transition on an execution")
    @ApiResponse(responseCode = "200", description = "Transition executed")
    @ApiResponse(responseCode = "404", description = "Execution not found",
        content = @Content(schema = @Schema(implementation = org.springframework.http.ProblemDetail.class)))
    @ApiResponse(responseCode = "422", description = "Invalid transition",
        content = @Content(schema = @Schema(implementation = org.springframework.http.ProblemDetail.class)))
    public TransitionResponse transition(
            @Parameter(description = "Execution unique identifier")
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
    @Operation(summary = "Get execution details")
    @ApiResponse(responseCode = "200", description = "Execution found")
    @ApiResponse(responseCode = "404", description = "Execution not found",
        content = @Content(schema = @Schema(implementation = org.springframework.http.ProblemDetail.class)))
    public ExecutionResponse getExecution(
            @Parameter(description = "Execution unique identifier")
            @PathVariable("executionId") UUID executionId) {
        var execution = getExecutionUseCase.execute(new WorkflowExecutionId(executionId));
        return executionResponseMapper.toExecutionResponse(execution);
    }


    @DeleteMapping("/executions/{executionId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Delete a terminal execution")
    @ApiResponse(responseCode = "204", description = "Execution deleted")
    @ApiResponse(responseCode = "404", description = "Execution not found",
        content = @Content(schema = @Schema(implementation = org.springframework.http.ProblemDetail.class)))
    @ApiResponse(responseCode = "409", description = "Execution is not in a terminal state",
        content = @Content(schema = @Schema(implementation = org.springframework.http.ProblemDetail.class)))
    public void deleteExecution(
            @Parameter(description = "Execution unique identifier")
            @PathVariable("executionId") UUID executionId) {
        deleteExecutionUseCase.execute(new WorkflowExecutionId(executionId));
    }

    @GetMapping("/executions/{executionId}/next-states")
    @Operation(summary = "Get available next states for an execution")
    @ApiResponse(responseCode = "200", description = "List of reachable states")
    @ApiResponse(responseCode = "404", description = "Execution not found",
        content = @Content(schema = @Schema(implementation = org.springframework.http.ProblemDetail.class)))
    public List<NextStatesResponse> nextStates(
            @Parameter(description = "Execution unique identifier")
            @PathVariable("executionId") UUID executionId
    ) {
        List<State> statesList = nextStatesUseCase.execute(new WorkflowExecutionId(executionId));
        return statesList.stream()
                .map(state -> new NextStatesResponse(state.code(), state.name()))
                .toList();
    }


    @GetMapping("/executions/{executionId}/history")
    @Operation(summary = "Get state transition history for an execution")
    @ApiResponse(responseCode = "200", description = "History of state changes")
    @ApiResponse(responseCode = "404", description = "Execution not found",
        content = @Content(schema = @Schema(implementation = org.springframework.http.ProblemDetail.class)))
    public List<HistoryItemResponse> history(
            @Parameter(description = "Execution unique identifier")
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
