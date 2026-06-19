package com.newen.workflowEngine.infrastructure.persistence.mapper;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

import com.newen.workflowEngine.domain.model.workflow.State;
import com.newen.workflowEngine.domain.model.workflow.Transition;
import com.newen.workflowEngine.domain.model.workflow.Workflow;
import com.newen.workflowEngine.domain.model.workflow.WorkflowId;
import com.newen.workflowEngine.infrastructure.persistence.entity.StateEntity;
import com.newen.workflowEngine.infrastructure.persistence.entity.TransitionEntity;
import com.newen.workflowEngine.infrastructure.persistence.entity.WorkflowEntity;

@Component
public class WorkflowMapper {

    public Workflow toDomain(WorkflowEntity entity) {
        
        WorkflowContext context = WorkflowContext.from(entity);
        
        List<Transition> transitions = entity.getTransitions().stream()
                .map(t -> new Transition(
                        context.state(t.getFrom().getCode()),
                        context.state(t.getTo().getCode())
                ))
                .toList();

        State initial = context.state(entity.getInitialState().getCode());

        return new Workflow(
                new WorkflowId(entity.getId()),
                entity.getName(),
                new ArrayList<>(context.states()),
                transitions,
                initial
        );
    }

    
    public WorkflowEntity toEntity(Workflow workflow) {

        WorkflowEntity entity = new WorkflowEntity();

        entity.setId(workflow.getId().value());
        entity.setName(workflow.getName());

        Map<State, StateEntity> stateEntities = new HashMap<>();

        List<StateEntity> states = workflow.getStates().stream()
                .map(s -> {
                    StateEntity se = new StateEntity();
                    se.setCode(s.code());
                    se.setName(s.name());
                    se.setTerminal(s.terminal());
                    se.setWorkflow(entity);
                    stateEntities.put(s, se);
                    return se;
                })
                .collect(Collectors.toList());

        entity.setStates(states);

        entity.setInitialState(stateEntities.get(workflow.getInitialState()));

        List<TransitionEntity> transitions = workflow.getTransitions().stream()
                .map(t -> {
                        TransitionEntity te = new TransitionEntity();
                        te.setWorkflow(entity);
                        te.setFrom(
                            stateEntities.get(t.getFrom())
                        );
                        te.setTo(
                            stateEntities.get(t.getTo())
                        );
                        return te;
                })
                .toList();

        entity.setTransitions(transitions);

        return entity;

    }


}