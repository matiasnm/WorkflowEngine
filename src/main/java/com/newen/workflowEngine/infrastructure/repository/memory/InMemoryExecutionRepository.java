package com.newen.workflowEngine.infrastructure.repository.memory;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import com.newen.workflowEngine.application.port.ExecutionRepository;
import com.newen.workflowEngine.domain.model.execution.WorkflowExecution;
import com.newen.workflowEngine.domain.model.execution.WorkflowExecutionId;

public class InMemoryExecutionRepository
        implements ExecutionRepository {

    private final Map<WorkflowExecutionId, WorkflowExecution> storage =
            new HashMap<>();

    @Override
    public Optional<WorkflowExecution> findById(
            WorkflowExecutionId id
    ) {
        return Optional.ofNullable(storage.get(id));
    }

    @Override
    public void save(
            WorkflowExecution execution
    ) {
        storage.put(execution.getId(), execution);
    }
}