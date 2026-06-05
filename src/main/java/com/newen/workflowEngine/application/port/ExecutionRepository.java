package com.newen.workflowEngine.application.port;

import java.util.Optional;

import com.newen.workflowEngine.domain.model.execution.WorkflowExecution;
import com.newen.workflowEngine.domain.model.execution.WorkflowExecutionId;

public interface ExecutionRepository {
    Optional<WorkflowExecution> findById(WorkflowExecutionId id);
    void save(WorkflowExecution instance);
}