package com.newen.workflowEngine.api.mapper;

import org.springframework.stereotype.Component;

import com.newen.workflowEngine.api.dto.ExecutionResponse;
import com.newen.workflowEngine.api.dto.StateResponse;
import com.newen.workflowEngine.domain.model.execution.WorkflowExecution;
import com.newen.workflowEngine.domain.model.workflow.State;

@Component
public class ExecutionResponseMapper {

    public ExecutionResponse toExecutionResponse(WorkflowExecution execution) {
        State current = execution.getCurrentState();
        return new ExecutionResponse(
                execution.getId().value(),
                execution.getWorkflowId().value(),
                new StateResponse(current.code(), current.name(), current.terminal())
        );
    }
}
