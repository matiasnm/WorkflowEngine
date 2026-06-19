package com.newen.workflowEngine.application.usecase.queries;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.newen.workflowEngine.application.port.WorkflowRepository;
import com.newen.workflowEngine.domain.model.workflow.Workflow;

@Service
public class ListWorkflowsUseCase {

    private final WorkflowRepository workflowRepository;

    public ListWorkflowsUseCase(WorkflowRepository workflowRepository) {
        this.workflowRepository = workflowRepository;
    }
    
    @Transactional(readOnly = true)
    public List<Workflow> execute() {
        return workflowRepository.findAll();
    }
}