package com.newen.workflowEngine.api.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;

@Schema(description = "Request to execute a transition to a target state")
public record TransitionRequest (
    @Schema(description = "Code of the target state to transition to", example = "approved")
    @NotBlank String targetStateCode
) {}