package com.newen.workflowEngine.api.dto;

import jakarta.validation.constraints.NotBlank;

public record StateRequest(
    @NotBlank String code,
    @NotBlank String name,
    boolean terminal
) {}
