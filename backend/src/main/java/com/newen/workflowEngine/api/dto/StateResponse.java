package com.newen.workflowEngine.api.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import io.swagger.v3.oas.annotations.media.Schema;

@JsonInclude(JsonInclude.Include.NON_NULL)
@Schema(description = "A state in the workflow definition")
public record StateResponse(
    @Schema(description = "State code used in transitions", example = "pending")
    String code,
    @Schema(description = "Human-readable state name", example = "Pending")
    String name,
    @Schema(description = "Whether this is a terminal (final) state", example = "false")
    boolean terminal
) {}