package com.newen.workflowEngine.domain.exception;

public class WorkflowHasActiveExecutionsException extends RuntimeException {

    public WorkflowHasActiveExecutionsException(String message) { super(message); }
    
}
