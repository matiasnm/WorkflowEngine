package com.newen.workflowEngine.api.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import io.swagger.v3.oas.annotations.media.Schema;

@JsonInclude(JsonInclude.Include.NON_NULL)
@Schema(description = "An allowed transition between two states")
public record TransitionDefinitionResponse(
    @Schema(description = "Source state code", example = "pending")
    String from,
    @Schema(description = "Target state code", example = "approved")
    String to
) {}