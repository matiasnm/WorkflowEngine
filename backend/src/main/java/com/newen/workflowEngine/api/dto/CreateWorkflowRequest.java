package com.newen.workflowEngine.api.dto;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

public record CreateWorkflowRequest(
    @NotBlank String name,
    @NotEmpty @Valid List<StateRequest> states,
    @NotNull @Valid List<TransitionRequestItem> transitions,
    @NotBlank String initialState
) {}