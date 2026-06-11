package com.newen.workflowEngine.api.dto;

import java.time.Instant;
import java.util.UUID;

public record TransitionResponse(
    UUID executionId,
    String previousState,
    String currentState,
    Instant timestamp
) {}