package com.newen.workflowEngine.infrastructure.persistence.adapter;

import org.springframework.stereotype.Component;

import com.newen.workflowEngine.application.port.StateChangedRepository;
import com.newen.workflowEngine.domain.event.StateChanged;
import com.newen.workflowEngine.infrastructure.persistence.entity.StateEntity;
import com.newen.workflowEngine.infrastructure.persistence.entity.WorkflowEntity;
import com.newen.workflowEngine.infrastructure.persistence.entity.WorkflowExecutionEntity;
import com.newen.workflowEngine.infrastructure.persistence.mapper.StateChangedMapper;
import com.newen.workflowEngine.infrastructure.persistence.repository.jpa.SpringDataStateChangedRepository;
import com.newen.workflowEngine.infrastructure.persistence.repository.jpa.SpringDataWorkflowExecutionRepository;

@Component
public class JpaStateChangedAdapter implements StateChangedRepository {

    private final SpringDataStateChangedRepository repo;
    private final StateChangedMapper mapper;
    private final SpringDataWorkflowExecutionRepository executionRepo;

    public JpaStateChangedAdapter(
        SpringDataStateChangedRepository repo, 
        StateChangedMapper mapper,
        SpringDataWorkflowExecutionRepository executionRepo) {
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