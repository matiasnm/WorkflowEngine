package com.newen.workflowEngine.domain.exception;

public class WorkflowExecutionNotFoundException extends RuntimeException {

    public WorkflowExecutionNotFoundException(String message) {
        super(message);
    }
}