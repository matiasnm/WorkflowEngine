package com.newen.workflowEngine.application.usecase.queries;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.newen.workflowEngine.application.port.WorkflowExecutionRepository;
import com.newen.workflowEngine.domain.model.execution.WorkflowExecution;
import com.newen.workflowEngine.domain.model.workflow.WorkflowId;

@Service
public class ListExecutionsUseCase {

    private final WorkflowExecutionRepository executionRepository;

    public ListExecutionsUseCase(WorkflowExecutionRepository executionRepository) {
        this.executionRepository = executionRepository;
    }

    @Transactional(readOnly = true)
    public List<WorkflowExecution> execute(WorkflowId workflowId) {
        return executionRepository.findByWorkflowId(workflowId);
    }
}
