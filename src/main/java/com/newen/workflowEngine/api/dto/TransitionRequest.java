package com.newen.workflowEngine.api.dto;

import com.newen.workflowEngine.domain.model.workflow.State;

public record TransitionRequest (
    State targetState
) {}