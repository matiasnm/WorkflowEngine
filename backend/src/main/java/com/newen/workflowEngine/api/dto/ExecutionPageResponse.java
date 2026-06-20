package com.newen.workflowEngine.api.dto;

import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Paginated list of workflow executions")
public record ExecutionPageResponse(
    @Schema(description = "Execution entries for this page")
    List<ExecutionResponse> content,
    @Schema(description = "Zero-based page index", example = "0")
    int page,
    @Schema(description = "Page size", example = "20")
    int size,
    @Schema(description = "Total number of executions", example = "42")
    long totalElements,
    @Schema(description = "Total number of pages", example = "3")
    int totalPages
) {}
