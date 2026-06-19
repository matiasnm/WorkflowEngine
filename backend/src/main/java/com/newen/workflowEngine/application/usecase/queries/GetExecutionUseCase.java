package com.newen.workflowEngine.application.usecase.queries;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.newen.workflowEngine.application.port.WorkflowExecutionRepository;
import com.newen.workflowEngine.domain.exception.WorkflowExecutionNotFoundException;
import com.newen.workflowEngine.domain.model.execution.WorkflowExecution;
import com.newen.workflowEngine.domain.model.execution.WorkflowExecutionId;

@Service
public class GetExecutionUseCase {

    private final WorkflowExecutionRepository executionRepository;

    public GetExecutionUseCase(WorkflowExecutionRepository executionRepository) {
        this.executionRepository = executionRepository;
    }
    
    @Transactional(readOnly = true)
    public WorkflowExecution execute(WorkflowExecutionId id) {
        return executionRepository.findById(id)
                .orElseThrow(() -> new WorkflowExecutionNotFoundException("Execution not found: " + id.value()));
    }
}