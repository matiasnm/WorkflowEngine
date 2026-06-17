package com.newen.workflowEngine.api.dto;

public record StateRequest(
    String name,
    boolean terminal
) {}
