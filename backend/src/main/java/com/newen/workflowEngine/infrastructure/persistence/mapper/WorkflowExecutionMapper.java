package com.newen.workflowEngine.infrastructure.persistence.mapper;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
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
    private final ObjectMapper objectMapper = new ObjectMapper();

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
        entity.setContext(serializeContext(execution.getContext()));
        entity.setCallbackUrl(execution.getCallbackUrl());
        
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
                    workflow.getId(),
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
            history,
            deserializeContext(entity.getContext()),
            entity.getCallbackUrl()
        );   
    }

    Map<String, Object> deserializeContext(String json) {
        if (json == null || json.isBlank()) return Map.of();
        try {
            return objectMapper.readValue(json, new TypeReference<Map<String, Object>>() {});
        } catch (JsonProcessingException e) {
            return Map.of();
        }
    }

    String serializeContext(Map<String, Object> context) {
        if (context == null || context.isEmpty()) return null;
        try {
            return objectMapper.writeValueAsString(context);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Failed to serialize execution context", e);
        }
    }

}
