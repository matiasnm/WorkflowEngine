package com.newen.workflowEngine.api.exception;

import java.time.Instant;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import com.newen.workflowEngine.domain.exception.InvalidTransitionException;
import com.newen.workflowEngine.domain.exception.StateNotFoundInWorkflowException;
import com.newen.workflowEngine.domain.exception.WorkflowNotFoundException;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(InvalidTransitionException.class)
    public ProblemDetail handleInvalidTransition(InvalidTransitionException ex) {

        ProblemDetail problem = ProblemDetail.forStatus(HttpStatus.UNPROCESSABLE_CONTENT);

        problem.setTitle("Invalid Transition");
        problem.setDetail(ex.getMessage());
        problem.setProperty("type", "workflow/invalid-transition");
        problem.setProperty("timestamp", Instant.now());

        return problem;
    }

    @ExceptionHandler(WorkflowNotFoundException.class)
    public ProblemDetail handleWorkflowNotFound(WorkflowNotFoundException ex) {

        ProblemDetail problem = ProblemDetail.forStatus(HttpStatus.NOT_FOUND);

        problem.setTitle("Workflow Not Found");
        problem.setDetail(ex.getMessage());
        problem.setProperty("type", "workflow/not-found");
        problem.setProperty("timestamp", Instant.now());

        return problem;
    }

    @ExceptionHandler(Exception.class)
    public ProblemDetail handleGeneric(Exception ex) {

        // 🔴 No perder la causa real
        log.error("Unhandled exception", ex);

        ProblemDetail problem = ProblemDetail.forStatus(HttpStatus.INTERNAL_SERVER_ERROR);

        problem.setTitle("Internal Server Error");

        // 🔴 No ocultar completamente el error
        problem.setDetail(ex.getMessage() != null
                ? ex.getMessage()
                : "Unexpected error occurred");

        problem.setProperty("type", "internal/error");
        problem.setProperty("timestamp", Instant.now());

        return problem;
        }

    @ExceptionHandler(StateNotFoundInWorkflowException.class)
    public ResponseEntity<ProblemDetail> handle(StateNotFoundInWorkflowException ex) {
        return ResponseEntity.status(422).body(
                ProblemDetail.forStatusAndDetail(
                        HttpStatus.UNPROCESSABLE_CONTENT,
                        ex.getMessage()
                )
        );
    }

}