package com.newen.workflowEngine.infrastructure.persistence.adapter;

import java.util.Optional;

import org.springframework.stereotype.Component;

import com.newen.workflowEngine.application.port.WorkflowExecutionRepository;
import com.newen.workflowEngine.domain.exception.StateNotFoundInWorkflowException;
import com.newen.workflowEngine.domain.exception.WorkflowNotFoundException;
import com.newen.workflowEngine.domain.model.execution.WorkflowExecution;
import com.newen.workflowEngine.domain.model.execution.WorkflowExecutionId;
import com.newen.workflowEngine.domain.model.workflow.Workflow;
import com.newen.workflowEngine.infrastructure.persistence.entity.StateEntity;
import com.newen.workflowEngine.infrastructure.persistence.entity.WorkflowEntity;
import com.newen.workflowEngine.infrastructure.persistence.mapper.WorkflowExecutionMapper;
import com.newen.workflowEngine.infrastructure.persistence.mapper.WorkflowMapper;
import com.newen.workflowEngine.infrastructure.persistence.repository.jpa.JpaWorkflowExecutionRepository;
import com.newen.workflowEngine.infrastructure.persistence.repository.jpa.JpaWorkflowRepository;

@Component
public class JpaWorkflowExecutionPersistenceAdapter implements WorkflowExecutionRepository {
    
    private final JpaWorkflowExecutionRepository repo;
    private final WorkflowExecutionMapper mapper;
    private final JpaWorkflowRepository workflowRepo;
    private final WorkflowMapper workflowMapper;

    public JpaWorkflowExecutionPersistenceAdapter(
            JpaWorkflowExecutionRepository repo,
            WorkflowExecutionMapper mapper,
            JpaWorkflowRepository workflowRepo,
            WorkflowMapper workflowMapper) {
        this.repo = repo;
        this.mapper = mapper;
        this.workflowRepo = workflowRepo;
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
                workflowRepo.findById(execution.getWorkflowId().value())
                    .orElseThrow(() -> new WorkflowNotFoundException("Workflow not found"));
        
                    String currentName = execution.getCurrentState().name();
        StateEntity current =
                workflowEntity.getStates().stream()
                        .filter(s -> s.getName().equals(currentName))
                        .findFirst()
                        .orElseThrow(() -> new StateNotFoundInWorkflowException(("State not found: " + currentName)));
        
        repo.save(mapper.toEntity(execution, workflowEntity, current));
    }

}