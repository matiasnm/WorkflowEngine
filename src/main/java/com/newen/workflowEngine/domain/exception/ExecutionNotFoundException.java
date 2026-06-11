package com.newen.workflowEngine.domain.exception;

public class ExecutionNotFoundException extends RuntimeException {

    public ExecutionNotFoundException(String message) {
        super(message);
    }
}