package com.newen.workflowEngine.api.dto;

public record TransitionRequestItem(
        String from,
        String to
) { }