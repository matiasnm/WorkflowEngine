package com.newen.workflowEngine.infrastructure.webhook;

import java.time.Instant;
import java.util.UUID;

public record WebhookPayload(
    UUID executionId,
    UUID workflowId,
    String fromStateCode,
    String fromStateName,
    String toStateCode,
    String toStateName,
    Instant timestamp
) {}