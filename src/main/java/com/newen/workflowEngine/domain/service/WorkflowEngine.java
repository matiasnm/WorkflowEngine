package com.newen.workflowEngine.domain.service;

import java.time.Instant;

import com.newen.workflowEngine.domain.event.StateChanged;
import com.newen.workflowEngine.domain.model.execution.WorkflowExecution;
import com.newen.workflowEngine.domain.model.workflow.State;
import com.newen.workflowEngine.domain.model.workflow.Workflow;


public class WorkflowEngine {

    public StateChanged transition(
            Workflow workflow,
            WorkflowExecution execution,
            State target
    ) {
        if (!workflow.allowsTransition(execution.getCurrentState(), target)) {
            throw new IllegalStateException("Invalid transition");
        }

        State from = execution.getCurrentState();

        execution.setCurrentState(target);

        StateChanged event = new StateChanged(
                execution.getId(),
                from,
                target,
                Instant.now()
        );

        execution.addEvent(event);

        return event;
    }
}