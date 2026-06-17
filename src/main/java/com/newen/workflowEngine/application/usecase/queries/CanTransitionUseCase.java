package com.newen.workflowEngine.application.usecase.queries;

import org.springframework.stereotype.Service;

import com.newen.workflowEngine.application.facade.WorkflowTransitionFacade;
import com.newen.workflowEngine.domain.model.execution.WorkflowExecutionId;
import com.newen.workflowEngine.domain.model.workflow.State;

@Service
public class CanTransitionUseCase {

    private final WorkflowTransitionFacade facade;

    public CanTransitionUseCase(WorkflowTransitionFacade workflowTransitionFacade) {
        this.facade = workflowTransitionFacade;
    }

    public boolean execute(
            WorkflowExecutionId executionId,
            State target
    ) {
        return facade.canTransition(executionId, target);
    }

}
