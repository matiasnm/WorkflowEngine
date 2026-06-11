package com.newen.workflowEngine.infrastructure.persistence.adapter;

import org.springframework.stereotype.Component;

import com.newen.workflowEngine.application.port.StateChangedRepository;
import com.newen.workflowEngine.domain.event.StateChanged;
import com.newen.workflowEngine.infrastructure.persistence.entity.StateEntity;
import com.newen.workflowEngine.infrastructure.persistence.entity.WorkflowEntity;
import com.newen.workflowEngine.infrastructure.persistence.entity.WorkflowExecutionEntity;
import com.newen.workflowEngine.infrastructure.persistence.mapper.StateChangedMapper;
import com.newen.workflowEngine.infrastructure.persistence.repository.jpa.JpaStateChangedRepository;
import com.newen.workflowEngine.infrastructure.persistence.repository.jpa.JpaWorkflowExecutionRepository;

@Component
public class JpaStateChangedPersistenceAdapter implements StateChangedRepository {

    private final JpaStateChangedRepository repo;
    private final StateChangedMapper mapper;
    private final JpaWorkflowExecutionRepository executionRepo;

    public JpaStateChangedPersistenceAdapter(
        JpaStateChangedRepository repo, 
        StateChangedMapper mapper,
        JpaWorkflowExecutionRepository executionRepo) {
        this.repo = repo;
        this.mapper = mapper;
        this.executionRepo = executionRepo;
    }

    @Override
    public void save(StateChanged event) {

        WorkflowExecutionEntity execution =
                executionRepo.findById(
                        event.getExecutionId().value()
                ).orElseThrow();

        WorkflowEntity workflow =
                execution.getWorkflow();

        StateEntity from =
                workflow.getStates()
                        .stream()
                        .filter(state ->
                                state.getName().equals(
                                        event.getFrom().name()
                                )
                        )
                        .findFirst()
                        .orElseThrow();

        StateEntity to =
                workflow.getStates()
                        .stream()
                        .filter(state ->
                                state.getName().equals(
                                        event.getTo().name()
                                )
                        )
                        .findFirst()
                        .orElseThrow();

        repo.save(
                mapper.toEntity(
                        event,
                        execution,
                        from,
                        to
                )
        );
    }

}