package com.newen.workflowEngine.infrastructure.persistence.repository.jpa;

import java.util.List;
import java.util.Set;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.newen.workflowEngine.infrastructure.persistence.entity.WorkflowExecutionEntity;


public interface JpaWorkflowExecutionRepository
        extends JpaRepository<WorkflowExecutionEntity, UUID> {

    List<WorkflowExecutionEntity> findByWorkflow_Id(UUID workflowId);

    Page<WorkflowExecutionEntity> findByWorkflow_Id(UUID workflowId, Pageable pageable);

    long countByWorkflow_Id(UUID workflowId);

    boolean existsByWorkflow_Id(UUID workflowId);

    long countByCurrentStateCode(String currentStateCode);

    @Query("SELECT COUNT(DISTINCT e.id) FROM WorkflowExecutionEntity e " +
           "JOIN e.history h " +
           "WHERE h.fromStateCode = :stateCode OR h.toStateCode = :stateCode")
    long countByStateCodeInHistory(@Param("stateCode") String stateCode);

    @Query("SELECT CASE WHEN COUNT(e) > 0 THEN true ELSE false END " +
           "FROM WorkflowExecutionEntity e " +
           "WHERE e.workflow.id = :workflowId " +
           "AND e.currentStateCode NOT IN :terminalStateCodes")
    boolean existsNonTerminalByWorkflowId(
            @Param("workflowId") UUID workflowId,
            @Param("terminalStateCodes") Set<String> terminalStateCodes);
}