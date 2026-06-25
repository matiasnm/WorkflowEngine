package com.newen.workflowEngine.application.usecase.commands;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.newen.workflowEngine.application.port.WorkflowExecutionRepository;
import com.newen.workflowEngine.application.port.WorkflowRepository;
import com.newen.workflowEngine.domain.exception.WorkflowHasExecutionsException;
import com.newen.workflowEngine.domain.exception.WorkflowNotFoundException;
import com.newen.workflowEngine.domain.model.workflow.WorkflowId;

@Service
public class DeleteWorkflowUseCase {

    private final WorkflowRepository workflowRepository;
    private final WorkflowExecutionRepository workflowExecutionRepository;

    public DeleteWorkflowUseCase(
            WorkflowRepository workflowRepository,
            WorkflowExecutionRepository workflowExecutionRepository
    ) {
        this.workflowRepository = workflowRepository;
        this.workflowExecutionRepository = workflowExecutionRepository;
    }


    @Transactional
    public void execute(WorkflowId workflowId) {
        workflowRepository.findById(workflowId)
            .orElseThrow(() -> new WorkflowNotFoundException("Workflow not found"));

        if (workflowExecutionRepository.existsByWorkflowId(workflowId)) {
            throw new WorkflowHasExecutionsException(
                "Cannot delete workflow with existing executions");
        }

        workflowRepository.deleteById(workflowId);
    }

}
