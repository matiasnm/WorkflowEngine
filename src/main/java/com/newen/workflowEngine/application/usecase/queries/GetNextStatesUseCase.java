package com.newen.workflowEngine.application.usecase.queries;

import java.util.List;

import org.springframework.stereotype.Service;

import com.newen.workflowEngine.application.port.WorkflowExecutionRepository;
import com.newen.workflowEngine.application.port.WorkflowRepository;
import com.newen.workflowEngine.domain.exception.WorkflowExecutionNotFoundException;
import com.newen.workflowEngine.domain.exception.WorkflowNotFoundException;
import com.newen.workflowEngine.domain.model.execution.WorkflowExecution;
import com.newen.workflowEngine.domain.model.execution.WorkflowExecutionId;
import com.newen.workflowEngine.domain.model.workflow.State;
import com.newen.workflowEngine.domain.model.workflow.Workflow;

@Service
public class GetNextStatesUseCase {

    private final WorkflowRepository workflowRepository;
    private final WorkflowExecutionRepository executionRepository;

    public GetNextStatesUseCase(
            WorkflowRepository workflowRepository,
            WorkflowExecutionRepository executionRepository
    ) {
        this.workflowRepository = workflowRepository;
        this.executionRepository = executionRepository;
    }

    public List<State> execute(WorkflowExecutionId executionId) {

        WorkflowExecution execution =
                executionRepository.findById(executionId)
                .orElseThrow(() -> new WorkflowExecutionNotFoundException("Execution not found"));

        Workflow workflow =
                workflowRepository.findById(execution.getWorkflowId())
                .orElseThrow(() -> new WorkflowNotFoundException("Workflow not found"));

        return workflow.nextStates(execution.getCurrentState());
    }
}