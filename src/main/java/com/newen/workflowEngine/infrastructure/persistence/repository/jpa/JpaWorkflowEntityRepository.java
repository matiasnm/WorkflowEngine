package com.newen.workflowEngine.infrastructure.persistence.repository.jpa;

import java.util.Optional;
import java.util.UUID;

import org.springframework.stereotype.Repository;

import com.newen.workflowEngine.infrastructure.persistence.entity.WorkflowEntity;
import com.newen.workflowEngine.infrastructure.persistence.repository.ports.WorkflowEntityRepository;

@Repository
public class JpaWorkflowEntityRepository implements WorkflowEntityRepository {

    private final JpaWorkflowRepository repo;

    public JpaWorkflowEntityRepository(JpaWorkflowRepository repo) {
        this.repo = repo;
    }

    @Override
    public Optional<WorkflowEntity> findById(UUID id) {
        return repo.findById(id);
    }
    
}
