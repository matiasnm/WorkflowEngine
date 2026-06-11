package com.newen.workflowEngine.domain.exception;

public class InvalidTransitionException extends RuntimeException {

    public InvalidTransitionException(String from, String to) {
        super(String.format(
                "Invalid transition from %s to %s",
                from,
                to
        ));
    }

    public InvalidTransitionException(String message) {
        super(message);
    }
}