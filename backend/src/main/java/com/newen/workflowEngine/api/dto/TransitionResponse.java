package com.newen.workflowEngine.api.dto;

import java.time.Instant;
import java.util.UUID;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record TransitionResponse(
    UUID executionId,
    String previousStateCode,
    String previousStateName,
    String currentStateCode,
    String currentStateName,
    Instant timestamp
) {}