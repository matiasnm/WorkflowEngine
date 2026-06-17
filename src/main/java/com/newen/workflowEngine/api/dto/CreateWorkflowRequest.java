package com.newen.workflowEngine.api.dto;

import java.util.List;

public record CreateWorkflowRequest(
    String name,
    List<StateRequest> states,
    List<TransitionRequestItem> transitions,
    String initialState
) {}