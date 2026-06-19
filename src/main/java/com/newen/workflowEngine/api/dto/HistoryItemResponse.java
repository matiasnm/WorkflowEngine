package com.newen.workflowEngine.api.dto;

import java.time.Instant;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record HistoryItemResponse(
    String fromStateCode,
    String fromStateName,
    String toStateCode,
    String toStateName,
    Instant timestamp
) {}