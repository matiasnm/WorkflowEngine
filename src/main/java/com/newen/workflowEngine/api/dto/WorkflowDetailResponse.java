package com.newen.workflowEngine.api.dto;

import java.util.List;
import java.util.UUID;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record WorkflowDetailResponse(
    UUID id,
    String name,
    List<StateResponse> states,
    List<TransitionDefinitionResponse> transitions,
    String initialState
) {}