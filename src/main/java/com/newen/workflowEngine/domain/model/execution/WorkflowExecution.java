package com.newen.workflowEngine.domain.model.execution;

import java.util.ArrayList;
import java.util.List;

import com.newen.workflowEngine.domain.event.StateChanged;
import com.newen.workflowEngine.domain.model.workflow.State;
import com.newen.workflowEngine.domain.model.workflow.WorkflowId;

public class WorkflowExecution {
    private final WorkflowExecutionId id;
    private final WorkflowId workflowId;
    private State currentState;
    private final List<StateChanged> history = new ArrayList<>();

    public WorkflowExecution(WorkflowExecutionId id, WorkflowId workflowId, State currentState) {
        this.id = id;
        this.workflowId = workflowId;
        this.currentState = currentState;
    }

    public void addEvent(StateChanged event) {
        history.add(event);
    }

    public List<StateChanged> getHistory() {
        return history;
    }
    
    public WorkflowExecutionId getId() {
        return id;
    }

    public WorkflowId getWorkflowId() {
        return workflowId;
    }

    public State getCurrentState() {
        return currentState;
    }

    public void setCurrentState(State state) {
        this.currentState = state;
    }

}