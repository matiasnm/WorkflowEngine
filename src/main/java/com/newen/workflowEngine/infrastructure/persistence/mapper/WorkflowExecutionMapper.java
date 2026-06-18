package com.newen.workflowEngine.infrastructure.persistence.mapper;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

import com.newen.workflowEngine.domain.event.StateChanged;
import com.newen.workflowEngine.domain.exception.StateNotFoundInWorkflowException;
import com.newen.workflowEngine.domain.model.execution.WorkflowExecution;
import com.newen.workflowEngine.domain.model.execution.WorkflowExecutionId;
import com.newen.workflowEngine.domain.model.workflow.State;
import com.newen.workflowEngine.domain.model.workflow.Workflow;
import com.newen.workflowEngine.infrastructure.persistence.entity.StateChangedEntity;
import com.newen.workflowEngine.infrastructure.persistence.entity.StateEntity;
import com.newen.workflowEngine.infrastructure.persistence.entity.WorkflowEntity;
import com.newen.workflowEngine.infrastructure.persistence.entity.WorkflowExecutionEntity;

@Component
public class WorkflowExecutionMapper {

    private final StateChangedMapper stateChangedMapper;

    public WorkflowExecutionMapper(StateChangedMapper stateChangedMapper) {
        this.stateChangedMapper = stateChangedMapper;
    }

    public WorkflowExecutionEntity toEntity(
            WorkflowExecution execution,
            WorkflowEntity workflowEntity,
            StateEntity currentState
    ) {
        WorkflowExecutionEntity entity = new WorkflowExecutionEntity();

        entity.setId(execution.getId().value());
        entity.setWorkflow(workflowEntity);
        entity.setCurrentState(currentState);

        // Map history events
        List<StateChangedEntity> historyEntities = execution.getHistory().stream()
            .map(event -> {
                StateEntity from = resolveState(workflowEntity, event.getFrom().name());
                StateEntity to = resolveState(workflowEntity, event.getTo().name());
                return stateChangedMapper.toEntity(event, entity, from, to);
            })
            .collect(Collectors.toList());
        entity.setHistory(historyEntities);
        
        return entity;
    }


    public WorkflowExecution toDomain(
        WorkflowExecutionEntity entity,
        Workflow workflow
    ) {
        WorkflowContext context = WorkflowContext.from(entity.getWorkflow());
        State current = context.state(entity.getCurrentState().getName());

        List<StateChanged> history = entity.getHistory().stream()
            .map(h -> {
                State from = context.state(h.getFrom().getName());
                State to = context.state(h.getTo().getName());
                return new StateChanged(
                    new WorkflowExecutionId(entity.getId()),
                    from,
                    to,
                    h.getTimestamp()
                );
        })
        .collect(Collectors.toList());

        return new WorkflowExecution(
            new WorkflowExecutionId(entity.getId()),
            workflow.getId(),
            current,
            history
        );   
    }


    private StateEntity resolveState(WorkflowEntity workflow, String name) {
        return workflow.getStates().stream()
            .filter(s -> s.getName().equals(name))
            .findFirst()
            .orElseThrow(() -> new StateNotFoundInWorkflowException("State not found: " + name));
    }

}
