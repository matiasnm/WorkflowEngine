package com.newen.workflowEngine.infrastructure.persistence.repository.memory;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Repository;

import com.newen.workflowEngine.application.port.WorkflowRepository;
import com.newen.workflowEngine.domain.model.workflow.Workflow;
import com.newen.workflowEngine.domain.model.workflow.WorkflowId;

@Profile("memory")
@Repository
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

    @Override
    public void update(Workflow workflow) {
        // In-memory has no JPA merge concern — same as save
        storage.put(workflow.getId(), workflow);
    }

    @Override
    public List<Workflow> findAll() {
        return List.copyOf(storage.values());
    }

    @Override
    public void deleteById(WorkflowId id) {
        storage.remove(id);
    }
}