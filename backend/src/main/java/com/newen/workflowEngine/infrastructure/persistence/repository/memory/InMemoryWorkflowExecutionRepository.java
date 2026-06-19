package com.newen.workflowEngine.infrastructure.persistence.repository.memory;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Repository;

import com.newen.workflowEngine.application.port.WorkflowExecutionRepository;
import com.newen.workflowEngine.domain.model.execution.WorkflowExecution;
import com.newen.workflowEngine.domain.model.execution.WorkflowExecutionId;
import com.newen.workflowEngine.domain.model.workflow.WorkflowId;

@Profile("memory")
@Repository
public class InMemoryWorkflowExecutionRepository
        implements WorkflowExecutionRepository {

    private final Map<WorkflowExecutionId, WorkflowExecution> storage =
            new HashMap<>();

    @Override
    public Optional<WorkflowExecution> findById(
            WorkflowExecutionId id
    ) {
        return Optional.ofNullable(storage.get(id));
    }

    @Override
    public List<WorkflowExecution> findByWorkflowId(WorkflowId workflowId) {
        return storage.values().stream()
                .filter(execution -> execution.getWorkflowId().equals(workflowId))
                .toList();
    }

    @Override
    public void save(
            WorkflowExecution execution
    ) {
        storage.put(execution.getId(), execution);
    }
}