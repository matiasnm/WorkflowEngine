package com.newen.workflowEngine.infrastructure.persistence.mapper;

import org.springframework.stereotype.Component;

import com.newen.workflowEngine.domain.event.StateChanged;
import com.newen.workflowEngine.domain.model.execution.WorkflowExecutionId;
import com.newen.workflowEngine.domain.model.workflow.State;
import com.newen.workflowEngine.infrastructure.persistence.entity.StateChangedEntity;
import com.newen.workflowEngine.infrastructure.persistence.entity.StateEntity;
import com.newen.workflowEngine.infrastructure.persistence.entity.WorkflowExecutionEntity;

@Component
public class StateChangedMapper {

    public StateChangedEntity toEntity(
            StateChanged event,
            WorkflowExecutionEntity execution,
            StateEntity from,
            StateEntity to
    ) {

        StateChangedEntity entity = new StateChangedEntity();

        entity.setExecution(execution);
        entity.setFrom(from);
        entity.setTo(to);
        entity.setTimestamp(event.getTimestamp());

        return entity;
    }


    public StateChanged toDomain(
            StateChangedEntity entity
    ) {

        return new StateChanged(
                new WorkflowExecutionId(
                        entity.getExecution().getId()
                ),
                new State(
                        entity.getFrom().getName(),
                        entity.getFrom().isTerminal()
                ),
                new State(
                        entity.getTo().getName(),
                        entity.getTo().isTerminal()
                ),
                entity.getTimestamp()
        );
    }

}