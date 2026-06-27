package com.newen.workflowEngine.api.controller;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import com.newen.workflowEngine.api.dto.CreateWorkflowRequest;
import com.newen.workflowEngine.api.dto.CreateWorkflowResponse;
import com.newen.workflowEngine.api.dto.WorkflowDetailResponse;
import com.newen.workflowEngine.api.dto.WorkflowEditabilityResponse;
import com.newen.workflowEngine.api.dto.WorkflowSummaryResponse;
import com.newen.workflowEngine.api.mapper.WorkflowRequestMapper;
import com.newen.workflowEngine.api.mapper.WorkflowResponseMapper;
import com.newen.workflowEngine.application.usecase.commands.CreateWorkflowUseCase;
import com.newen.workflowEngine.application.usecase.commands.DeleteWorkflowUseCase;
import com.newen.workflowEngine.application.usecase.commands.UpdateWorkflowUseCase;
import com.newen.workflowEngine.application.usecase.queries.GetWorkflowEditabilityUseCase;
import com.newen.workflowEngine.application.usecase.queries.GetWorkflowUseCase;
import com.newen.workflowEngine.application.usecase.queries.ListWorkflowsUseCase;
import com.newen.workflowEngine.domain.model.workflow.State;
import com.newen.workflowEngine.domain.model.workflow.Transition;
import com.newen.workflowEngine.domain.model.workflow.Workflow;
import com.newen.workflowEngine.domain.model.workflow.WorkflowId;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;

@RestController
@Tag(name = "Workflows", description = "API to manage workflow definitions")
@SecurityRequirement(name = "ApiKey")
public class WorkflowController {

    private final CreateWorkflowUseCase createUseCase;
    private final ListWorkflowsUseCase listWorkflowsUseCase;
    private final GetWorkflowUseCase getWorkflowUseCase;
    private final WorkflowRequestMapper workflowRequestMapper;
    private final WorkflowResponseMapper workflowResponseMapper;
    private final DeleteWorkflowUseCase deleteWorkflowUseCase;
    private final UpdateWorkflowUseCase updateWorkflowUseCase;
    private final GetWorkflowEditabilityUseCase getWorkflowEditabilityUseCase;

    public WorkflowController(
            CreateWorkflowUseCase createUseCase,
            ListWorkflowsUseCase listWorkflowsUseCase,
            GetWorkflowUseCase getWorkflowUseCase,
            WorkflowRequestMapper workflowRequestMapper,
            WorkflowResponseMapper workflowResponseMapper,
            DeleteWorkflowUseCase deleteWorkflowUseCase,
            UpdateWorkflowUseCase updateWorkflowUseCase,
            GetWorkflowEditabilityUseCase getWorkflowEditabilityUseCase
    ) {
        this.createUseCase = createUseCase;
        this.listWorkflowsUseCase = listWorkflowsUseCase;
        this.getWorkflowUseCase = getWorkflowUseCase;
        this.workflowRequestMapper = workflowRequestMapper;
        this.workflowResponseMapper = workflowResponseMapper;
        this.deleteWorkflowUseCase = deleteWorkflowUseCase;
        this.updateWorkflowUseCase = updateWorkflowUseCase;
        this.getWorkflowEditabilityUseCase = getWorkflowEditabilityUseCase;
    }


    @PostMapping("/workflows")
    @Operation(summary = "Create a new workflow definition")
    @ApiResponse(responseCode = "200", description = "Workflow created successfully")
    @ApiResponse(responseCode = "400", description = "Invalid request body",
        content = @Content(schema = @Schema(implementation = org.springframework.http.ProblemDetail.class)))
    public CreateWorkflowResponse create(@Valid @RequestBody CreateWorkflowRequest request) {
        Map<String, State> statesByCode = workflowRequestMapper.buildStateMap(request);
        List<Transition> transitions = workflowRequestMapper.buildTransitions(request, statesByCode);
        Workflow workflow = createUseCase.execute(
                request.name(),
                List.copyOf(statesByCode.values()),
                transitions,
                statesByCode.get(request.initialState())
        );
        return new CreateWorkflowResponse(workflow.getId().value());
    }


    @GetMapping("/workflows")
    @Operation(summary = "List all workflow definitions")
    public List<WorkflowSummaryResponse> listWorkflows() {
        return listWorkflowsUseCase.execute().stream()
                .map(workflowResponseMapper::toSummary)
                .toList();
    }


    @GetMapping("/workflows/{workflowId}")
    @Operation(summary = "Get workflow definition details")
    @ApiResponse(responseCode = "200", description = "Workflow found")
    @ApiResponse(responseCode = "404", description = "Workflow not found",
        content = @Content(schema = @Schema(implementation = org.springframework.http.ProblemDetail.class)))
    public WorkflowDetailResponse getWorkflow(
            @Parameter(description = "Workflow unique identifier")
            @PathVariable("workflowId") UUID workflowId) {
        Workflow workflow = getWorkflowUseCase.execute(new WorkflowId(workflowId));
        return workflowResponseMapper.toDetail(workflow);
    }

    @PutMapping("/workflows/{workflowId}")
    @Operation(summary = "Replace a workflow definition")
    @ApiResponse(responseCode = "200", description = "Workflow updated")
    @ApiResponse(responseCode = "404", description = "Workflow not found",
        content = @Content(schema = @Schema(implementation = org.springframework.http.ProblemDetail.class)))
    @ApiResponse(responseCode = "409", description = "Workflow has non-terminal executions",
        content = @Content(schema = @Schema(implementation = org.springframework.http.ProblemDetail.class)))
    public WorkflowDetailResponse updateWorkflow(
            @Parameter(description = "Workflow unique identifier")
            @PathVariable UUID workflowId,
            @Valid @RequestBody CreateWorkflowRequest request) {

        Map<String, State> statesByCode = workflowRequestMapper.buildStateMap(request);
        List<Transition> transitions = workflowRequestMapper.buildTransitions(request, statesByCode);
        Workflow workflow = updateWorkflowUseCase.execute(
            new WorkflowId(workflowId),
            request.name(),
            List.copyOf(statesByCode.values()),
            transitions,
            statesByCode.get(request.initialState())
        );
        return workflowResponseMapper.toDetail(workflow);
    }

    @GetMapping("/workflows/{workflowId}/editable")
    @Operation(summary = "Get workflow editability pre-flight information")
    @ApiResponse(responseCode = "200", description = "Editability info retrieved")
    @ApiResponse(responseCode = "404", description = "Workflow not found",
        content = @Content(schema = @Schema(implementation = org.springframework.http.ProblemDetail.class)))
    public WorkflowEditabilityResponse getWorkflowEditability(
            @Parameter(description = "Workflow unique identifier")
            @PathVariable("workflowId") UUID workflowId) {
        return getWorkflowEditabilityUseCase.execute(workflowId);
    }

    @DeleteMapping("/workflows/{workflowId}")
    @Operation(summary = "Deletes workflow definition")
    @ApiResponse(responseCode = "204", description = "Workflow deleted")
    @ApiResponse(responseCode = "404", description = "Workflow not found",
        content = @Content(schema = @Schema(implementation = org.springframework.http.ProblemDetail.class)))
    @ApiResponse(responseCode = "409", description = "Workflow has existing executions",
        content = @Content(schema = @Schema(implementation = org.springframework.http.ProblemDetail.class)))
    public void deleteWorkflow(
            @Parameter(description = "Workflow unique identifier")
            @PathVariable("workflowId") UUID workflowId) {
        deleteWorkflowUseCase.execute(new WorkflowId(workflowId));
    }
}
