package com.newen.workflowEngine.infrastructure.persistence.adapter;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

import com.newen.workflowEngine.application.port.WorkflowRepository;
import com.newen.workflowEngine.domain.model.workflow.Workflow;
import com.newen.workflowEngine.domain.model.workflow.WorkflowId;
import com.newen.workflowEngine.infrastructure.persistence.mapper.WorkflowMapper;
import com.newen.workflowEngine.infrastructure.persistence.repository.jpa.JpaWorkflowRepository;

@Component
public class JpaWorkflowPersistenceAdapter implements WorkflowRepository {

    private final JpaWorkflowRepository repository;
    private final WorkflowMapper mapper;

    public JpaWorkflowPersistenceAdapter(
        JpaWorkflowRepository repository, 
        WorkflowMapper mapper) {
        this.repository = repository;
        this.mapper = mapper;
    }

    @Override
    public Optional<Workflow> findById(WorkflowId id) {
        return repository.findById(id.value())
                .map(mapper::toDomain);
    }

    @Override
    public void save(Workflow workflow) {
        repository.save(
                mapper.toEntity(workflow)
        );
    }

    @Override
    public List<Workflow> findAll() {
        return repository.findAll().stream()
                .map(mapper::toDomain)
                .collect(Collectors.toList());
    }
    
}
