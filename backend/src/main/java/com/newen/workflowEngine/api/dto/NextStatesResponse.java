package com.newen.workflowEngine.api.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import io.swagger.v3.oas.annotations.media.Schema;

@JsonInclude(JsonInclude.Include.NON_NULL)
@Schema(description = "A reachable next state from the current execution state")
public record NextStatesResponse(
    @Schema(description = "State code", example = "approved")
    String code,
    @Schema(description = "Human-readable state name", example = "Approved")
    String name
) {}