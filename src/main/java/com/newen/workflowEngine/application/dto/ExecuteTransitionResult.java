package com.newen.workflowEngine.application.dto;

import com.newen.workflowEngine.domain.model.execution.WorkflowExecutionId;
import com.newen.workflowEngine.domain.model.workflow.State;

public record ExecuteTransitionResult(
        WorkflowExecutionId executionId,
        State previousState,
        State currentState
) {}