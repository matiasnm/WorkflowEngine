package com.newen.workflowEngine.application.usecase.queries;

import com.newen.workflowEngine.application.port.ExecutionRepository;
import com.newen.workflowEngine.application.port.WorkflowRepository;
import com.newen.workflowEngine.domain.model.execution.WorkflowExecution;
import com.newen.workflowEngine.domain.model.execution.WorkflowExecutionId;
import com.newen.workflowEngine.domain.model.workflow.State;
import com.newen.workflowEngine.domain.model.workflow.Workflow;

public class CanTransitionUseCase {

    private final WorkflowRepository workflowRepository;
    private final ExecutionRepository executionRepository;

    public CanTransitionUseCase(
            WorkflowRepository workflowRepository,
            ExecutionRepository executionRepository
    ) {
        this.workflowRepository = workflowRepository;
        this.executionRepository = executionRepository;
    }

    public boolean execute(
            WorkflowExecutionId executionId,
            State target
    ) {

        WorkflowExecution execution =
                executionRepository.findById(executionId)
                .orElseThrow(() -> new RuntimeException("Execution not found"));

        Workflow workflow =
                workflowRepository.findById(execution.getWorkflowId())
                .orElseThrow(() -> new RuntimeException("Workflow not found"));

        return workflow.allowsTransition(
                execution.getCurrentState(),
                target
        );
    }
}