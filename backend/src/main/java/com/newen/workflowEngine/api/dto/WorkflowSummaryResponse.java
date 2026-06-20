package com.newen.workflowEngine.api.dto;

import java.util.UUID;

import com.fasterxml.jackson.annotation.JsonInclude;

import io.swagger.v3.oas.annotations.media.Schema;

@JsonInclude(JsonInclude.Include.NON_NULL)
@Schema(description = "Summary of a workflow definition")
public record WorkflowSummaryResponse(
    @Schema(description = "Workflow unique identifier", example = "3fa85f64-5717-4562-b3fc-2c963f66afa6")
    UUID id,
    @Schema(description = "Workflow name", example = "Order Fulfillment")
    String name,
    @Schema(description = "Number of states in the workflow", example = "3")
    int statesCount,
    @Schema(description = "Number of transitions in the workflow", example = "4")
    int transitionsCount
) {}