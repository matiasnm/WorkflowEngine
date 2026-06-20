package com.newen.workflowEngine.api.dto;

import java.time.Instant;

import com.fasterxml.jackson.annotation.JsonInclude;

import io.swagger.v3.oas.annotations.media.Schema;

@JsonInclude(JsonInclude.Include.NON_NULL)
@Schema(description = "A single state transition in an execution's history")
public record HistoryItemResponse(
    @Schema(description = "Previous state code", example = "pending")
    String fromStateCode,
    @Schema(description = "Previous state name", example = "Pending")
    String fromStateName,
    @Schema(description = "New state code", example = "approved")
    String toStateCode,
    @Schema(description = "New state name", example = "Approved")
    String toStateName,
    @Schema(description = "When the transition occurred", example = "2026-06-20T10:30:00Z")
    Instant timestamp
) {}