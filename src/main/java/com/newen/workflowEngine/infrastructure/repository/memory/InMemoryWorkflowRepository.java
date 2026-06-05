package com.newen.workflowEngine.infrastructure.repository.memory;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import com.newen.workflowEngine.application.port.WorkflowRepository;
import com.newen.workflowEngine.domain.model.workflow.Workflow;
import com.newen.workflowEngine.domain.model.workflow.WorkflowId;

public class InMemoryWorkflowRepository
        implements WorkflowRepository {

    private final Map<WorkflowId, Workflow> storage =
            new HashMap<>();

    @Override
    public Optional<Workflow> findById(WorkflowId id) {
        return Optional.ofNullable(storage.get(id));
    }

    @Override
    public void save(Workflow workflow) {
        storage.put(workflow.getId(), workflow);
    }
}