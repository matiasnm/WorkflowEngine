package com.newen.workflowEngine.api.dto;

import java.util.Map;

import com.fasterxml.jackson.annotation.JsonInclude;

import io.swagger.v3.oas.annotations.media.Schema;

@JsonInclude(JsonInclude.Include.NON_NULL)
@Schema(description = "Request to start a new workflow execution")
public record StartExecutionRequest(
    
    @Schema(description = "Arbitrary JSON metadata attached to this execution", example = "{\"orderId\": \"ORD-123\", \"amount\": 4500}")
    Map<String, Object> context,

    @Schema(description = "Optional callback URL for webhook notifications")
    String callbackUrl
) {}
