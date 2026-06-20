package com.newen.workflowEngine.api.exception;

import java.time.Instant;
import java.util.Map;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import com.newen.workflowEngine.domain.exception.InvalidTransitionException;
import com.newen.workflowEngine.domain.exception.StateNotFoundInWorkflowException;
import com.newen.workflowEngine.domain.exception.WorkflowExecutionNotFoundException;
import com.newen.workflowEngine.domain.exception.WorkflowNotFoundException;

import jakarta.validation.ConstraintViolationException;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ProblemDetail handleValidationErrors(MethodArgumentNotValidException ex) {
        ProblemDetail problem = ProblemDetail.forStatus(HttpStatus.BAD_REQUEST);
        problem.setTitle("Validation Failed");
        problem.setProperty("type", "validation/error");
        problem.setProperty("timestamp", Instant.now());
        problem.setProperty("errors", ex.getBindingResult().getFieldErrors().stream()
                .map(e -> Map.of("field", e.getField(), "message", e.getDefaultMessage()))
                .collect(Collectors.toList()));
        return problem;
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ProblemDetail handleConstraintViolation(ConstraintViolationException ex) {
        ProblemDetail problem = ProblemDetail.forStatus(HttpStatus.BAD_REQUEST);
        problem.setTitle("Constraint Violation");
        problem.setProperty("type", "validation/constraint-violation");
        problem.setProperty("timestamp", Instant.now());
        problem.setProperty("errors", ex.getConstraintViolations().stream()
                .map(v -> Map.of(
                        "field", v.getPropertyPath().toString(),
                        "message", v.getMessage()))
                .collect(Collectors.toList()));
        return problem;
    }

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

    @ExceptionHandler(WorkflowExecutionNotFoundException.class)
    public ProblemDetail handleExecutionNotFound(WorkflowExecutionNotFoundException ex) {

        ProblemDetail problem = ProblemDetail.forStatus(HttpStatus.NOT_FOUND);

        problem.setTitle("Execution Not Found");
        problem.setDetail(ex.getMessage());
        problem.setProperty("type", "execution/not-found");
        problem.setProperty("timestamp", Instant.now());

        return problem;
    }

    @ExceptionHandler(StateNotFoundInWorkflowException.class)
    public ProblemDetail handleStateNotFound(StateNotFoundInWorkflowException ex) {

        ProblemDetail problem = ProblemDetail.forStatus(HttpStatus.UNPROCESSABLE_CONTENT);

        problem.setTitle("State Not Found");
        problem.setDetail(ex.getMessage());
        problem.setProperty("type", "workflow/state-not-found");
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

}