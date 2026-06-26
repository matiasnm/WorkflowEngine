package com.newen.workflowEngine.domain.model.execution;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;

import com.newen.workflowEngine.domain.event.StateChanged;
import com.newen.workflowEngine.domain.model.workflow.State;
import com.newen.workflowEngine.domain.model.workflow.WorkflowId;

public class WorkflowExecution {

    private final WorkflowExecutionId id;
    private final WorkflowId workflowId;
    private final State currentState;
    private final List<StateChanged> history;
    private final Map<String, Object> context;

    /**
     * Simple constructor — for starting a new execution without context.
     */
    public WorkflowExecution(
        WorkflowExecutionId id,
        WorkflowId workflowId,
        State currentState
    ) {
        this(id, workflowId, currentState, new ArrayList<>(), null);
    }

    /**
     * Convenience constructor — for starting a new execution with context.
     */
    public WorkflowExecution(
        WorkflowExecutionId id,
        WorkflowId workflowId,
        State currentState,
        Map<String, Object> context
    ) {
        this(id, workflowId, currentState, new ArrayList<>(), context);
    }

    /**
     * Full reconstruction constructor — for persistence mapping, testing, and
     * {@link #withTransition(State, StateChanged)}.
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
     * @param context     arbitrary JSON metadata, or null/empty for none
     */
    public WorkflowExecution(
        WorkflowExecutionId id,
        WorkflowId workflowId,
        State currentState,
        List<StateChanged> history,
        Map<String, Object> context
    ) {
        this.id = id;
        this.workflowId = workflowId;
        this.currentState = currentState;
        this.history = new ArrayList<>(history);
        this.context = context != null ? Map.copyOf(context) : Map.of();
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

    public Map<String, Object> getContext() {
        return context;
    }

    /**
     * Returns a new {@link WorkflowExecution} with the given {@code target} state
     * and {@code event} appended to the history. Context is preserved unchanged.
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
       return new WorkflowExecution(this.id, this.workflowId, target, newHistory, this.context);
   }

}