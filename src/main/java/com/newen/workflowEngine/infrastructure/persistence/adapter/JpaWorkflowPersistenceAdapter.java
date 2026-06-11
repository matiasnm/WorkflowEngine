package com.newen.workflowEngine.infrastructure.persistence.adapter;

import java.util.Optional;

import org.springframework.stereotype.Component;

import com.newen.workflowEngine.application.port.WorkflowRepository;
import com.newen.workflowEngine.domain.model.workflow.Workflow;
import com.newen.workflowEngine.domain.model.workflow.WorkflowId;
import com.newen.workflowEngine.infrastructure.persistence.mapper.WorkflowMapper;
import com.newen.workflowEngine.infrastructure.persistence.repository.jpa.SpringDataWorkflowRepository;

@Component
public class JpaWorkflowPersistenceAdapter implements WorkflowRepository {

    private final SpringDataWorkflowRepository repository;
    private final WorkflowMapper mapper;

    public JpaWorkflowPersistenceAdapter(
        SpringDataWorkflowRepository repository, 
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
    
}
