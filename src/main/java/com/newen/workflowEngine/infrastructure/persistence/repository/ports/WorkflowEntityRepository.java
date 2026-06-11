package com.newen.workflowEngine.infrastructure.persistence.repository.ports;

import java.util.Optional;
import java.util.UUID;

import com.newen.workflowEngine.infrastructure.persistence.entity.WorkflowEntity;

public interface WorkflowEntityRepository {

    Optional<WorkflowEntity> findById(UUID id);
    
}