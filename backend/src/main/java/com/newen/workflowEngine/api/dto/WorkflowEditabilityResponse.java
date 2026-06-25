package com.newen.workflowEngine.api.dto;

import java.util.List;
import java.util.UUID;

import com.fasterxml.jackson.annotation.JsonInclude;

import io.swagger.v3.oas.annotations.media.Schema;

@JsonInclude(JsonInclude.Include.NON_NULL)
@Schema(description = "Pre-flight information about what can be edited in a workflow")
public record WorkflowEditabilityResponse(
    @Schema(description = "Workflow unique identifier")
    UUID workflowId,
    @Schema(description = "Whether the workflow has any executions")
    boolean hasExecutions,
    @Schema(description = "Total number of executions")
    int executionCount,
    @Schema(description = "Edit restrictions")
    Restrictions restrictions
) {
    @JsonInclude(JsonInclude.Include.NON_NULL)
    @Schema(description = "Restrictions that apply when editing this workflow")
    public record Restrictions(
        @Schema(description = "State codes that can be freely renamed/removed")
        List<String> renameableStates,
        @Schema(description = "State codes that are locked (referenced by executions)")
        List<String> lockedStates,
        @Schema(description = "Human-readable reason why states are locked")
        String lockedReason,
        @Schema(description = "Whether the terminal flag can be changed on any state")
        boolean canChangeTerminal,
        @Schema(description = "Whether states can be removed")
        boolean canRemoveStates,
        @Schema(description = "Whether the workflow name can be changed")
        boolean canRenameWorkflow,
        @Schema(description = "Whether new states can be added")
        boolean canAddStates,
        @Schema(description = "Whether the initial state can be changed")
        boolean canChangeInitialState,
        @Schema(description = "Whether new transitions can be added")
        boolean canAddTransitions,
        @Schema(description = "Whether transitions can be removed")
        boolean canRemoveTransitions
    ) {}
}
