package com.newen.workflowEngine.api.dto;

import java.util.UUID;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record CreateWorkflowResponse(
    UUID workflowId
) {}