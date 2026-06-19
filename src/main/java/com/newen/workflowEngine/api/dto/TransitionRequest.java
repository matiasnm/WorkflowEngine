package com.newen.workflowEngine.api.dto;

public record TransitionRequest (
    String targetStateCode
) {}