package com.newen.workflowEngine.domain.exception;

import java.util.List;

public class WorkflowEditException extends RuntimeException {

    private final transient List<String> violations;

    public WorkflowEditException(String message, List<String> violations) {
        super(message);
        this.violations = List.copyOf(violations);
    }

    public List<String> getViolations() {
        return violations;
    }
}
