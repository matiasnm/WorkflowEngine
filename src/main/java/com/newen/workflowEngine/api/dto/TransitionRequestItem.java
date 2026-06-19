package com.newen.workflowEngine.api.dto;

import jakarta.validation.constraints.NotBlank;

public record TransitionRequestItem(
    @NotBlank String from,
    @NotBlank String to
) { }