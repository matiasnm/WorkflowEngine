package com.newen.workflowEngine.application.port;

import java.util.List;

import com.newen.workflowEngine.domain.event.StateChanged;
import com.newen.workflowEngine.domain.model.execution.WorkflowExecutionId;

public interface StateChangedRepository {
    List<StateChanged> findByWorkflowExecutionId(WorkflowExecutionId executionId);
    void save(StateChanged event);
}