package com.newen.workflowEngine.api.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;

@Schema(description = "A transition definition for a new workflow")
public record TransitionRequestItem(
    @Schema(description = "Source state code", example = "pending")
    @NotBlank String from,
    @Schema(description = "Target state code", example = "approved")
    @NotBlank String to
) { }