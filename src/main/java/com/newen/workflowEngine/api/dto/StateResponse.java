package com.newen.workflowEngine.api.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record StateResponse(
    String code,
    String name,
    boolean terminal
) {}