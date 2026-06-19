package com.newen.workflowEngine.application.usecase.queries;

import org.springframework.stereotype.Service;

import com.newen.workflowEngine.application.facade.WorkflowTransitionFacade;
import com.newen.workflowEngine.domain.model.execution.WorkflowExecutionId;

@Service
public class CanTransitionUseCase {

    private final WorkflowTransitionFacade facade;

    public CanTransitionUseCase(WorkflowTransitionFacade facade) {
        this.facade = facade;
    }

    public boolean execute(
            WorkflowExecutionId executionId,
            String targetStateCode
    ) {
        return facade.canTransition(executionId, targetStateCode);
    }

}
