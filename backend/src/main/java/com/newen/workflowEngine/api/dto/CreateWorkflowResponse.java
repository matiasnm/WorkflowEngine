package com.newen.workflowEngine.api.dto;

import java.util.UUID;

import com.fasterxml.jackson.annotation.JsonInclude;

import io.swagger.v3.oas.annotations.media.Schema;

@JsonInclude(JsonInclude.Include.NON_NULL)
@Schema(description = "Response after creating a new workflow")
public record CreateWorkflowResponse(
    @Schema(description = "Unique identifier of the created workflow", example = "3fa85f64-5717-4562-b3fc-2c963f66afa6")
    UUID workflowId
) {}