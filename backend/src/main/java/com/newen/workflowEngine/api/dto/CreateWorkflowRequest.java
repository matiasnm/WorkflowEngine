package com.newen.workflowEngine.api.dto;

import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

@Schema(description = "Request to create a new workflow definition")
public record CreateWorkflowRequest(
    @Schema(description = "Workflow name", example = "Order Fulfillment")
    @NotBlank String name,
    @Schema(description = "List of states in the workflow")
    @NotEmpty @Valid List<StateRequest> states,
    @Schema(description = "List of allowed transitions between states")
    @NotNull @Valid List<TransitionRequestItem> transitions,
    @Schema(description = "Code of the initial state", example = "pending")
    @NotBlank String initialState
) {}