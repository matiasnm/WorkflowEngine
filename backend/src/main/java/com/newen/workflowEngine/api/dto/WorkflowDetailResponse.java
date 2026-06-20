package com.newen.workflowEngine.api.dto;

import java.util.List;
import java.util.UUID;

import com.fasterxml.jackson.annotation.JsonInclude;

import io.swagger.v3.oas.annotations.media.Schema;

@JsonInclude(JsonInclude.Include.NON_NULL)
@Schema(description = "Detailed view of a workflow definition including states and transitions")
public record WorkflowDetailResponse(
    @Schema(description = "Workflow unique identifier", example = "3fa85f64-5717-4562-b3fc-2c963f66afa6")
    UUID id,
    @Schema(description = "Workflow name", example = "Order Fulfillment")
    String name,
    @Schema(description = "List of states in the workflow")
    List<StateResponse> states,
    @Schema(description = "List of allowed transitions")
    List<TransitionDefinitionResponse> transitions,
    @Schema(description = "Code of the initial state", example = "pending")
    String initialState
) {}