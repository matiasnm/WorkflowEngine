package com.newen.workflowEngine.api.dto;

import java.time.Instant;
import java.util.UUID;

import com.fasterxml.jackson.annotation.JsonInclude;

import io.swagger.v3.oas.annotations.media.Schema;

@JsonInclude(JsonInclude.Include.NON_NULL)
@Schema(description = "Result of a successful state transition")
public record TransitionResponse(
    @Schema(description = "Execution unique identifier", example = "3fa85f64-5717-4562-b3fc-2c963f66afa6")
    UUID executionId,
    @Schema(description = "Previous state code", example = "pending")
    String previousStateCode,
    @Schema(description = "Previous state name", example = "Pending")
    String previousStateName,
    @Schema(description = "Current state code", example = "approved")
    String currentStateCode,
    @Schema(description = "Current state name", example = "Approved")
    String currentStateName,
    @Schema(description = "Timestamp of the transition", example = "2026-06-20T10:30:00Z")
    Instant timestamp
) {}