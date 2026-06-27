package com.newen.workflowEngine.domain.event;

import java.time.Instant;

import com.newen.workflowEngine.domain.model.execution.WorkflowExecutionId;
import com.newen.workflowEngine.domain.model.workflow.State;
import com.newen.workflowEngine.domain.model.workflow.WorkflowId;

public class StateChanged {
    WorkflowExecutionId executionId;
    WorkflowId workflowId;
    State from;
    State to;
    Instant timestamp;

    public StateChanged(WorkflowExecutionId executionId, WorkflowId workflowId, State from, State to, Instant timestamp) {
        this.executionId = executionId;
        this.workflowId = workflowId;
        this.from = from;
        this.to = to;
        this.timestamp = timestamp;
    }

    @Override
    public String toString() {
        StringBuilder sb = new StringBuilder();
        sb.append("StateChanged{");
        sb.append("executionId=").append(executionId);
        sb.append(", workflowId=").append(workflowId);
        sb.append(", from=").append(from);
        sb.append(", to=").append(to);
        sb.append(", timestamp=").append(timestamp);
        sb.append('}');
        return sb.toString();
    }

    public WorkflowExecutionId getExecutionId() {
        return executionId;
    }

    public WorkflowId getWorkflowId() { return workflowId; }

    public State getFrom() {
        return from;
    }

    public State getTo() {
        return to;
    }

    public Instant getTimestamp() {
        return timestamp;
    }

}