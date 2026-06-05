package com.newen.workflowEngine.application.usecase.queries;

import java.util.List;

import com.newen.workflowEngine.application.port.ExecutionRepository;
import com.newen.workflowEngine.domain.event.StateChanged;
import com.newen.workflowEngine.domain.model.execution.WorkflowExecution;
import com.newen.workflowEngine.domain.model.execution.WorkflowExecutionId;

public class GetHistoryUseCase {

    private final ExecutionRepository executionRepository;

    public GetHistoryUseCase(
            ExecutionRepository executionRepository
    ) {
        this.executionRepository = executionRepository;
    }

    public List<StateChanged> execute(WorkflowExecutionId executionId) {

        WorkflowExecution execution =
                executionRepository.findById(executionId)
                .orElseThrow(() -> new RuntimeException("Execution not found"));

        return execution.getHistory();
    }
}