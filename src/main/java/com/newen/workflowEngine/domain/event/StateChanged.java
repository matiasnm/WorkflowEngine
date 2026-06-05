package com.newen.workflowEngine.domain.event;

import java.time.Instant;

import com.newen.workflowEngine.domain.model.execution.WorkflowExecutionId;
import com.newen.workflowEngine.domain.model.workflow.State;

public class StateChanged {
    WorkflowExecutionId instanceId;
    State from;
    State to;
    Instant timestamp;
    
    public StateChanged(WorkflowExecutionId instanceId, State from, State to, Instant timestamp) {
        this.instanceId = instanceId;
        this.from = from;
        this.to = to;
        this.timestamp = timestamp;
    }

    @Override
    public String toString() {
        StringBuilder sb = new StringBuilder();
        sb.append("StateChanged{");
        sb.append("instanceId=").append(instanceId);
        sb.append(", from=").append(from);
        sb.append(", to=").append(to);
        sb.append(", timestamp=").append(timestamp);
        sb.append('}');
        return sb.toString();
    }
}