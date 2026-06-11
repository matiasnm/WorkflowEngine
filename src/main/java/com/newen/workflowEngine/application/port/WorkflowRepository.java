package com.newen.workflowEngine.application.port;

import java.util.Optional;

import com.newen.workflowEngine.domain.model.workflow.Workflow;
import com.newen.workflowEngine.domain.model.workflow.WorkflowId;

public interface WorkflowRepository {
    
    Optional<Workflow> findById(WorkflowId id);

    void save(Workflow workflow);
}