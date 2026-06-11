package com.newen.workflowEngine.application.usecase.commands.dto;

import java.time.Instant;

import com.newen.workflowEngine.domain.model.execution.WorkflowExecutionId;
import com.newen.workflowEngine.domain.model.workflow.State;

public record ExecuteTransitionResult(
        WorkflowExecutionId executionId,
        State previousState,
        State currentState,
        Instant timestamp
) {}