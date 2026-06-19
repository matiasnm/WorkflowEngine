package com.newen.workflowEngine.api.dto;

import java.time.Instant;

public record HistoryItemResponse(
    String fromStateCode,
    String fromStateName,
    String toStateCode,
    String toStateName,
    Instant timestamp
) {}