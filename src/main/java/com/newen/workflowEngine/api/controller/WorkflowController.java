package com.newen.workflowEngine.api.controller;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import com.newen.workflowEngine.api.dto.CreateWorkflowRequest;
import com.newen.workflowEngine.api.dto.CreateWorkflowResponse;
import com.newen.workflowEngine.api.dto.WorkflowDetailResponse;
import com.newen.workflowEngine.api.dto.WorkflowSummaryResponse;
import com.newen.workflowEngine.api.mapper.WorkflowRequestMapper;
import com.newen.workflowEngine.api.mapper.WorkflowResponseMapper;
import com.newen.workflowEngine.application.usecase.commands.CreateWorkflowUseCase;
import com.newen.workflowEngine.application.usecase.queries.GetWorkflowUseCase;
import com.newen.workflowEngine.application.usecase.queries.ListWorkflowsUseCase;
import com.newen.workflowEngine.domain.model.workflow.State;
import com.newen.workflowEngine.domain.model.workflow.Transition;
import com.newen.workflowEngine.domain.model.workflow.Workflow;
import com.newen.workflowEngine.domain.model.workflow.WorkflowId;

import jakarta.validation.Valid;

@RestController
public class WorkflowController {

    private final CreateWorkflowUseCase createUseCase;
    private final ListWorkflowsUseCase listWorkflowsUseCase;
    private final GetWorkflowUseCase getWorkflowUseCase;
    private final WorkflowRequestMapper workflowRequestMapper;
    private final WorkflowResponseMapper workflowResponseMapper;

    public WorkflowController(
            CreateWorkflowUseCase createUseCase,
            ListWorkflowsUseCase listWorkflowsUseCase,
            GetWorkflowUseCase getWorkflowUseCase,
            WorkflowRequestMapper workflowRequestMapper,
            WorkflowResponseMapper workflowResponseMapper
    ) {
        this.createUseCase = createUseCase;
        this.listWorkflowsUseCase = listWorkflowsUseCase;
        this.getWorkflowUseCase = getWorkflowUseCase;
        this.workflowRequestMapper = workflowRequestMapper;
        this.workflowResponseMapper = workflowResponseMapper;
    }


    @PostMapping("/workflows")
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
    public List<WorkflowSummaryResponse> listWorkflows() {
        return listWorkflowsUseCase.execute().stream()
                .map(workflowResponseMapper::toSummary)
                .toList();
    }


    @GetMapping("/workflows/{workflowId}")
    public WorkflowDetailResponse getWorkflow(@PathVariable("workflowId") UUID workflowId) {
        Workflow workflow = getWorkflowUseCase.execute(new WorkflowId(workflowId));
        return workflowResponseMapper.toDetail(workflow);
    }
}
