package com.newen.workflowEngine.api.dto;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

import com.fasterxml.jackson.annotation.JsonInclude;

import io.swagger.v3.oas.annotations.media.Schema;

@JsonInclude(JsonInclude.Include.NON_NULL)
@Schema(description = "Summary of a workflow execution")
public record ExecutionResponse(
    @Schema(description = "Execution unique identifier", example = "3fa85f64-5717-4562-b3fc-2c963f66afa6")
    UUID id,
    @Schema(description = "Workflow unique identifier", example = "3fa85f64-5717-4562-b3fc-2c963f66afa6")
    UUID workflowId,
    @Schema(description = "Current state of the execution")
    StateResponse currentState,
    @Schema(description = "When the execution entered the current state", example = "2026-06-20T10:30:00Z")
    Instant currentStateSince,
    @Schema(description = "Arbitrary JSON metadata attached when the execution was started")
    Map<String, Object> context
) {}