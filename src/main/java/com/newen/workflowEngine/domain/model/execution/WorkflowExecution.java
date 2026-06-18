package com.newen.workflowEngine.domain.model.execution;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import com.newen.workflowEngine.domain.event.StateChanged;
import com.newen.workflowEngine.domain.model.workflow.State;
import com.newen.workflowEngine.domain.model.workflow.WorkflowId;

public class WorkflowExecution {

    private final WorkflowExecutionId id;
    private final WorkflowId workflowId;
    private final State currentState;
    private final List<StateChanged> history;

    public WorkflowExecution(
        WorkflowExecutionId id,
        WorkflowId workflowId,
        State currentState
    ) {
        this.id = id;
        this.workflowId = workflowId;
        this.currentState = currentState;
        this.history = new ArrayList<>();
    }

    /**
    * Reconstruction constructor — for persistence mapping and testing only.
    * <p>
    * Does <b>not</b> validate transition rules. To transition an execution to a new state,
    * use {@link #withTransition(State, StateChanged)} which is called exclusively by
    * {@link com.newen.workflowEngine.domain.service.WorkflowEngine#transition(
    * com.newen.workflowEngine.domain.model.workflow.Workflow,
    * WorkflowExecution,
    * com.newen.workflowEngine.domain.model.workflow.State)}.
    * </p>
    *
    * @param id          the execution identity
    * @param workflowId  the workflow this execution belongs to
    * @param currentState the current state (not validated against workflow)
    * @param history     the full event history, in chronological order
    */
    public WorkflowExecution(
        WorkflowExecutionId id,
        WorkflowId workflowId,
        State currentState,
        List<StateChanged> history
    ) {
        this.id = id;
        this.workflowId = workflowId;
        this.currentState = currentState;
        this.history = new ArrayList<>(history);
    }

    public List<StateChanged> getHistory() {
        return Collections.unmodifiableList(history);
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

    /**
    * Returns a new {@link WorkflowExecution} with the given {@code target} state
    * and {@code event} appended to the history.
    * <p>
    * Does <b>not</b> validate whether the transition is allowed by the workflow.
    * Callers must perform validation before invoking this method.
    * </p>
    * <p>
    * In production, this is called exclusively by
    * {@link com.newen.workflowEngine.domain.service.WorkflowEngine#transition(
    * com.newen.workflowEngine.domain.model.workflow.Workflow,
    * WorkflowExecution,
    * com.newen.workflowEngine.domain.model.workflow.State)}.
    * </p>
    *
    * @param target the new state to transition to
    * @param event  the domain event recording this transition
    * @return a new execution instance with the transition applied
    */
    public WorkflowExecution withTransition(State target, StateChanged event) {
       List<StateChanged> newHistory = new ArrayList<>(this.history);
       newHistory.add(event);
       return new WorkflowExecution(this.id, this.workflowId, target, newHistory);
   }

}