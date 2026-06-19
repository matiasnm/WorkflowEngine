package com.newen.workflowEngine.application.usecase.queries;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.newen.workflowEngine.application.port.WorkflowRepository;
import com.newen.workflowEngine.domain.exception.WorkflowNotFoundException;
import com.newen.workflowEngine.domain.model.workflow.Workflow;
import com.newen.workflowEngine.domain.model.workflow.WorkflowId;

@Service
public class GetWorkflowUseCase {

    private final WorkflowRepository workflowRepository;

    public GetWorkflowUseCase(WorkflowRepository workflowRepository) {
        this.workflowRepository = workflowRepository;
    }
    
    @Transactional(readOnly = true)
    public Workflow execute(WorkflowId id) {
        return workflowRepository.findById(id)
                .orElseThrow(() -> new WorkflowNotFoundException("Workflow not found: " + id.value()));
    }
}