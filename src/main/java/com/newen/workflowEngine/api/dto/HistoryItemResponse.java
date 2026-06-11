package com.newen.workflowEngine.api.dto;

import java.time.Instant;

public record HistoryItemResponse(
    String fromState,
    String toState,
    Instant timestamp
) {}