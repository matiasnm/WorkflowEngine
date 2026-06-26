package com.newen.workflowEngine.application.usecase.commands;

import java.util.Map;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.newen.workflowEngine.application.port.WorkflowExecutionRepository;
import com.newen.workflowEngine.application.port.WorkflowRepository;
import com.newen.workflowEngine.domain.exception.WorkflowNotFoundException;
import com.newen.workflowEngine.domain.model.execution.WorkflowExecution;
import com.newen.workflowEngine.domain.model.execution.WorkflowExecutionId;
import com.newen.workflowEngine.domain.model.workflow.Workflow;
import com.newen.workflowEngine.domain.model.workflow.WorkflowId;

@Service
public class StartWorkflowExecutionUseCase {

    private final WorkflowRepository workflowRepository;
    private final WorkflowExecutionRepository executionRepository;

    public StartWorkflowExecutionUseCase(
            WorkflowRepository workflowRepository,
            WorkflowExecutionRepository executionRepository
    ) {
        this.workflowRepository = workflowRepository;
        this.executionRepository = executionRepository;
    }

    @Transactional
    public WorkflowExecution execute(
            WorkflowId workflowId
    ) {
        return execute(workflowId, null);
    }

    @Transactional
    public WorkflowExecution execute(
            WorkflowId workflowId,
            Map<String, Object> context
    ) {

        Workflow workflow = workflowRepository.findById(workflowId)
        .orElseThrow(() -> new WorkflowNotFoundException("Workflow not found"));

        // Porque new WorkflowExecutionId?
        // La identidad de un agregado siempre la genera el sistema, no el exterior
        WorkflowExecution execution =
                new WorkflowExecution(
                        new WorkflowExecutionId(UUID.randomUUID()),
                        workflow.getId(),
                        workflow.getInitialState(),
                        context
                );

        executionRepository.save(execution);

        return execution;
    }
}