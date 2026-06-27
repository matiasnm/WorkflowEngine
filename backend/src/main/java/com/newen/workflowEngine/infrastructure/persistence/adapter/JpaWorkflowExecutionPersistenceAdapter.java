package com.newen.workflowEngine.infrastructure.persistence.adapter;

import java.util.List;
import java.util.Optional;
import java.util.Set;

import org.springframework.context.annotation.Profile;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;

import com.newen.workflowEngine.application.port.WorkflowExecutionRepository;
import com.newen.workflowEngine.domain.model.execution.WorkflowExecution;
import com.newen.workflowEngine.domain.model.execution.WorkflowExecutionId;
import com.newen.workflowEngine.domain.model.workflow.Workflow;
import com.newen.workflowEngine.domain.model.workflow.WorkflowId;
import com.newen.workflowEngine.infrastructure.persistence.entity.WorkflowEntity;
import com.newen.workflowEngine.infrastructure.persistence.mapper.WorkflowExecutionMapper;
import com.newen.workflowEngine.infrastructure.persistence.mapper.WorkflowMapper;
import com.newen.workflowEngine.infrastructure.persistence.repository.jpa.JpaWorkflowExecutionRepository;

import jakarta.persistence.EntityManager;

@Profile({"h2", "pg"})
@Component
public class JpaWorkflowExecutionPersistenceAdapter implements WorkflowExecutionRepository {
    private final JpaWorkflowExecutionRepository repo;
    private final WorkflowExecutionMapper mapper;
    private final WorkflowMapper workflowMapper;
    private final EntityManager entityManager;

    public JpaWorkflowExecutionPersistenceAdapter(
            JpaWorkflowExecutionRepository repo,
            WorkflowExecutionMapper mapper,
            WorkflowMapper workflowMapper,
            EntityManager entityManager
    ) {
        this.repo = repo;
        this.mapper = mapper;
        this.workflowMapper = workflowMapper;
        this.entityManager = entityManager;
    }

    @Override
    public Optional<WorkflowExecution> findById(WorkflowExecutionId id) {
        return repo.findById(id.value())
                .map(e -> {
                    Workflow workflow = workflowMapper.toDomain(e.getWorkflow());
                    return mapper.toDomain(e, workflow);
                });
    }

    @Override
    public List<WorkflowExecution> findByWorkflowId(WorkflowId workflowId) {
        return repo.findByWorkflow_Id(workflowId.value()).stream()
                .map(entity -> {
                    Workflow workflow = workflowMapper.toDomain(entity.getWorkflow());
                    return mapper.toDomain(entity, workflow);
                })
                .toList();
    }

    @Override
    public List<WorkflowExecution> findByWorkflowId(WorkflowId workflowId, int page, int size) {
        return repo.findByWorkflow_Id(workflowId.value(), PageRequest.of(page, size)).stream()
                .map(entity -> {
                    Workflow workflow = workflowMapper.toDomain(entity.getWorkflow());
                    return mapper.toDomain(entity, workflow);
                })
                .toList();
    }

    @Override
    public int countByWorkflowId(WorkflowId workflowId) {
        return (int) repo.countByWorkflow_Id(workflowId.value());
    }

    @Override
    public void save(WorkflowExecution execution) {
        // getReference() → JPA proxy, NO database query, just the ID
        WorkflowEntity workflowRef = entityManager.getReference(
                WorkflowEntity.class,
                execution.getWorkflowId().value()
        );
        repo.save(mapper.toEntity(execution, workflowRef));
    }

    @Override
    public boolean existsByWorkflowId(WorkflowId workflowId) {
        return repo.existsByWorkflow_Id(workflowId.value());
    }

    @Override
    public void deleteById(WorkflowExecutionId id) {
        repo.deleteById(id.value());
    }

    @Override
    public boolean existsNonTerminalByWorkflowId(WorkflowId workflowId, Set<String> terminalStateCodes) {
        return repo.existsNonTerminalByWorkflowId(workflowId.value(), terminalStateCodes);
    }

    @Override
    public long countByCurrentStateCode(String stateCode) {
        return repo.countByCurrentStateCode(stateCode);
    }

    @Override
    public long countByStateCodeInHistory(String stateCode) {
        return repo.countByStateCodeInHistory(stateCode);
    }
}