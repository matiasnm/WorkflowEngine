package com.newen.workflowEngine.application.port;

import com.newen.workflowEngine.domain.model.execution.WorkflowExecution;
import com.newen.workflowEngine.domain.model.execution.WorkflowExecutionId;

public interface ExecutionRepository {
    WorkflowExecution findById(WorkflowExecutionId id);
    void save(WorkflowExecution instance);
}