package com.newen.workflowEngine.application.usecase.commands;

import org.springframework.stereotype.Service;

import com.newen.workflowEngine.application.facade.WorkflowTransitionFacade;
import com.newen.workflowEngine.application.usecase.commands.dto.ExecuteTransitionResult;
import com.newen.workflowEngine.domain.model.execution.WorkflowExecutionId;

@Service
public class ExecuteTransitionUseCase {

    private final WorkflowTransitionFacade facade;

    public ExecuteTransitionUseCase(
            WorkflowTransitionFacade workflowTransitionFacade
    ) {
        this.facade = workflowTransitionFacade;
    }

    public ExecuteTransitionResult execute(
            WorkflowExecutionId executionId,
            String targetStateCode
    ) {
        return facade.transition(executionId, targetStateCode);
    }

}
