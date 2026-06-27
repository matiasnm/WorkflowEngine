package com.newen.workflowEngine.domain.service;

import java.time.Instant;

import com.newen.workflowEngine.domain.event.StateChanged;
import com.newen.workflowEngine.domain.exception.InvalidTransitionException;
import com.newen.workflowEngine.domain.model.execution.WorkflowExecution;
import com.newen.workflowEngine.domain.model.workflow.State;
import com.newen.workflowEngine.domain.model.workflow.Workflow;


public class WorkflowEngine {

    public record TransitionResult(WorkflowExecution execution, StateChanged event) {}

    public TransitionResult transition(
            Workflow workflow,
            WorkflowExecution execution,
            State target
    ) {
        if (!workflow.allowsTransition(execution.getCurrentState(), target)) {
            throw new InvalidTransitionException(execution.getCurrentState().name(), target.name());
        }

        State from = execution.getCurrentState();

        StateChanged event = new StateChanged(
                execution.getId(),
                workflow.getId(),
                from,
                target,
                Instant.now()
        );

        WorkflowExecution updated = execution.withTransition(target, event);
        
        return new TransitionResult(updated, event);
    }
}