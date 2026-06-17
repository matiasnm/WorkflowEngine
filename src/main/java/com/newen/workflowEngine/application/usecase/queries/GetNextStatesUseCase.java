package com.newen.workflowEngine.application.usecase.queries;

import java.util.List;

import org.springframework.stereotype.Service;

import com.newen.workflowEngine.application.facade.WorkflowTransitionFacade;
import com.newen.workflowEngine.domain.model.execution.WorkflowExecutionId;
import com.newen.workflowEngine.domain.model.workflow.State;

@Service
public class GetNextStatesUseCase {

    private final WorkflowTransitionFacade facade;

    public GetNextStatesUseCase(WorkflowTransitionFacade workflowTransitionFacade) {
        this.facade = workflowTransitionFacade;
    }

    public List<State> execute(WorkflowExecutionId executionId) {
        return facade.nextStates(executionId);
    }

}
