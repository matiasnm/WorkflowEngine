package com.newen.workflowEngine.api.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;

@Schema(description = "A state definition for a new workflow")
public record StateRequest(
    @Schema(description = "State code (unique within the workflow)", example = "pending")
    @NotBlank String code,
    @Schema(description = "Human-readable state name", example = "Pending")
    @NotBlank String name,
    @Schema(description = "Whether this is a terminal (final) state", example = "false")
    boolean terminal
) {}
