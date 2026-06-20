package com.newen.workflowEngine.infrastructure.persistence.repository.jpa;

import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import com.newen.workflowEngine.infrastructure.persistence.entity.WorkflowExecutionEntity;


public interface JpaWorkflowExecutionRepository
        extends JpaRepository<WorkflowExecutionEntity, UUID> {

    List<WorkflowExecutionEntity> findByWorkflow_Id(UUID workflowId);

    Page<WorkflowExecutionEntity> findByWorkflow_Id(UUID workflowId, Pageable pageable);

    long countByWorkflow_Id(UUID workflowId);
}