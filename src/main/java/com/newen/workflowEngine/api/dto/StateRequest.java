package com.newen.workflowEngine.api.dto;

public record StateRequest(
    String code,
    String name,
    boolean terminal
) {}
