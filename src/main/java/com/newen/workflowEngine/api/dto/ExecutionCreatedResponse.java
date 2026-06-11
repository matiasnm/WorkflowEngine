package com.newen.workflowEngine.api.dto;

import java.util.UUID;

public record ExecutionCreatedResponse(
    UUID executionId
) {}