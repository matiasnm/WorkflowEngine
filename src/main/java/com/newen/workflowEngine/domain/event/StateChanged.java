package com.newen.workflowEngine.domain.event;

import java.time.Instant;

import com.newen.workflowEngine.domain.model.execution.WorkflowExecutionId;
import com.newen.workflowEngine.domain.model.workflow.State;

public class StateChanged {
    WorkflowExecutionId executionId;
    State from;
    State to;
    Instant timestamp;
    
    public StateChanged(WorkflowExecutionId executionId, State from, State to, Instant timestamp) {
        this.executionId = executionId;
        this.from = from;
        this.to = to;
        this.timestamp = timestamp;
    }

    @Override
    public String toString() {
        StringBuilder sb = new StringBuilder();
        sb.append("StateChanged{");
        sb.append("executionId=").append(executionId);
        sb.append(", from=").append(from);
        sb.append(", to=").append(to);
        sb.append(", timestamp=").append(timestamp);
        sb.append('}');
        return sb.toString();
    }

    public WorkflowExecutionId getExecutionId() {
        return executionId;
    }

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