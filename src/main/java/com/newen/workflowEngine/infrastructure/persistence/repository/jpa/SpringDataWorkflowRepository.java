package com.newen.workflowEngine.infrastructure.persistence.repository.jpa;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.newen.workflowEngine.infrastructure.persistence.entity.WorkflowEntity;

public interface SpringDataWorkflowRepository
        extends JpaRepository<WorkflowEntity, UUID> {
}