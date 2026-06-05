package com.newen.workflowEngine.application.port;

import com.newen.workflowEngine.domain.model.workflow.Workflow;
import com.newen.workflowEngine.domain.model.workflow.WorkflowId;

public interface WorkflowRepository {
    Workflow findById(WorkflowId id);
}