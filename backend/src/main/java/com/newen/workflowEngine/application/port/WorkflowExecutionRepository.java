package com.newen.workflowEngine.application.port;

import java.util.List;
import java.util.Optional;

import com.newen.workflowEngine.domain.model.execution.WorkflowExecution;
import com.newen.workflowEngine.domain.model.execution.WorkflowExecutionId;
import com.newen.workflowEngine.domain.model.workflow.WorkflowId;

public interface WorkflowExecutionRepository {

    Optional<WorkflowExecution> findById(WorkflowExecutionId id);

    List<WorkflowExecution> findByWorkflowId(WorkflowId workflowId);

    void save(WorkflowExecution instance);
}