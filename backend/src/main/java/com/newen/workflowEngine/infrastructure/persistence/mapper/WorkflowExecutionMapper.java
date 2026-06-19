package com.newen.workflowEngine.infrastructure.persistence.mapper;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

import com.newen.workflowEngine.domain.event.StateChanged;
import com.newen.workflowEngine.domain.model.execution.WorkflowExecution;
import com.newen.workflowEngine.domain.model.execution.WorkflowExecutionId;
import com.newen.workflowEngine.domain.model.workflow.State;
import com.newen.workflowEngine.domain.model.workflow.Workflow;
import com.newen.workflowEngine.infrastructure.persistence.entity.StateChangedEntity;
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
            WorkflowEntity workflowEntity
    ) {
        WorkflowExecutionEntity entity = new WorkflowExecutionEntity();

        entity.setId(execution.getId().value());
        entity.setWorkflow(workflowEntity);
        entity.setCurrentStateCode(execution.getCurrentState().code());
        
        List<StateChangedEntity> historyEntities = execution.getHistory().stream()
            .map(event -> stateChangedMapper.toEntity(event, entity))
            .collect(Collectors.toList());
        
            entity.setHistory(historyEntities);
        return entity;
    }


    public WorkflowExecution toDomain(
        WorkflowExecutionEntity entity,
        Workflow workflow
    ) {
        WorkflowContext context = WorkflowContext.from(entity.getWorkflow());
        State current = context.state(entity.getCurrentStateCode());

        List<StateChanged> history = entity.getHistory().stream()
            .map(h -> {
                State from = context.state(h.getFromStateCode());
                State to = context.state(h.getToStateCode());
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

}
