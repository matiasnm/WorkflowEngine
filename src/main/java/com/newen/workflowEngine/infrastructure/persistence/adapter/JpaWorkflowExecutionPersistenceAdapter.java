package com.newen.workflowEngine.infrastructure.persistence.adapter;

import java.util.Optional;

import org.springframework.stereotype.Component;

import com.newen.workflowEngine.application.port.WorkflowExecutionRepository;
import com.newen.workflowEngine.domain.exception.WorkflowNotFoundException;
import com.newen.workflowEngine.domain.model.execution.WorkflowExecution;
import com.newen.workflowEngine.domain.model.execution.WorkflowExecutionId;
import com.newen.workflowEngine.domain.model.workflow.Workflow;
import com.newen.workflowEngine.infrastructure.persistence.entity.StateEntity;
import com.newen.workflowEngine.infrastructure.persistence.entity.WorkflowEntity;
import com.newen.workflowEngine.infrastructure.persistence.mapper.WorkflowExecutionMapper;
import com.newen.workflowEngine.infrastructure.persistence.mapper.WorkflowMapper;
import com.newen.workflowEngine.infrastructure.persistence.repository.jpa.JpaWorkflowExecutionRepository;
import com.newen.workflowEngine.infrastructure.persistence.repository.ports.WorkflowEntityRepository;

@Component
public class JpaWorkflowExecutionPersistenceAdapter implements WorkflowExecutionRepository {
    
    private final JpaWorkflowExecutionRepository repo;
    private final WorkflowExecutionMapper mapper;
    private final WorkflowEntityRepository workflowEntityRepository;
    private final WorkflowMapper workflowMapper;

    public JpaWorkflowExecutionPersistenceAdapter(
        JpaWorkflowExecutionRepository repo, 
        WorkflowExecutionMapper mapper, 
        WorkflowEntityRepository workflowEntityRepository, 
        WorkflowMapper workflowMapper) {
        this.repo = repo;
        this.mapper = mapper;
        this.workflowEntityRepository = workflowEntityRepository;
        this.workflowMapper = workflowMapper;
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
    public void save(WorkflowExecution execution) {

        WorkflowEntity workflowEntity =
                workflowEntityRepository.findById(
                        execution.getWorkflowId().value())
                            .orElseThrow(() -> new WorkflowNotFoundException("Workflow not found"));

        StateEntity current =
                workflowEntity.getStates().stream()
                        .filter(s -> s.getName()
                                .equals(execution.getCurrentState().name()))
                        .findFirst()
                        .orElseThrow();

        repo.save(
                mapper.toEntity(
                        execution,
                        workflowEntity,
                        current
                )
        );
    }

}