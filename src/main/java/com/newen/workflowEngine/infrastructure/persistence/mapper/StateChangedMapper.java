package com.newen.workflowEngine.infrastructure.persistence.mapper;

import org.springframework.stereotype.Component;

import com.newen.workflowEngine.domain.event.StateChanged;
import com.newen.workflowEngine.infrastructure.persistence.entity.StateChangedEntity;
import com.newen.workflowEngine.infrastructure.persistence.entity.WorkflowExecutionEntity;

@Component
public class StateChangedMapper {

    public StateChangedEntity toEntity(
            StateChanged event,
            WorkflowExecutionEntity execution
    ) {

        StateChangedEntity entity = new StateChangedEntity();

        entity.setExecution(execution);
        entity.setFromStateCode(event.getFrom().code());
        entity.setToStateCode(event.getTo().code());
        entity.setTimestamp(event.getTimestamp());

        return entity;
    }

}