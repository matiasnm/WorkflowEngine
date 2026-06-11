package com.newen.workflowEngine.domain.exception;

public class StateNotFoundInWorkflowException extends RuntimeException {

    public StateNotFoundInWorkflowException(String stateName) {
        super("State not found in workflow: " + stateName);
    }
}