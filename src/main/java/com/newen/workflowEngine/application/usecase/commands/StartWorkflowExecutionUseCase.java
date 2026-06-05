package com.newen.workflowEngine.application.usecase.commands;

import com.newen.workflowEngine.application.port.ExecutionRepository;
import com.newen.workflowEngine.application.port.WorkflowRepository;
import com.newen.workflowEngine.domain.model.execution.WorkflowExecution;
import com.newen.workflowEngine.domain.model.execution.WorkflowExecutionId;
import com.newen.workflowEngine.domain.model.workflow.Workflow;
import com.newen.workflowEngine.domain.model.workflow.WorkflowId;

public class StartWorkflowExecutionUseCase {

    private final WorkflowRepository workflowRepository;
    private final ExecutionRepository executionRepository;

    public StartWorkflowExecutionUseCase(
            WorkflowRepository workflowRepository,
            ExecutionRepository executionRepository
    ) {
        this.workflowRepository = workflowRepository;
        this.executionRepository = executionRepository;
    }

    public WorkflowExecution execute(
            WorkflowId workflowId,
            WorkflowExecutionId executionId
    ) {

        Workflow workflow = workflowRepository.findById(workflowId);

        WorkflowExecution execution =
                new WorkflowExecution(
                        executionId,
                        workflow.getId(),
                        workflow.getInitialState()
                );

        executionRepository.save(execution);

        return execution;
    }
}