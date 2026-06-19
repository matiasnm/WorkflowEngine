package com.newen.workflowEngine.api.dto;

import jakarta.validation.constraints.NotBlank;

public record TransitionRequest (
    @NotBlank String targetStateCode
) {}