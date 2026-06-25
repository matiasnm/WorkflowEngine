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

    /**
     * Reconciles a domain {@link Workflow} with an existing {@link WorkflowEntity}
     * for UPDATE operations.
     * <p>
     * States are matched by {@code code} — existing {@link StateEntity} instances
     * keep their JPA IDs and are updated in-place; new ones are created; removed
     * ones are dropped via orphan removal. Transitions are always replaced entirely.
     * </p>
     */
    public WorkflowEntity toEntityForUpdate(Workflow workflow, WorkflowEntity existing) {
        existing.setName(workflow.getName());

        // Index existing states by code (preserve JPA IDs)
        Map<String, StateEntity> existingByCode = existing.getStates().stream()
                .collect(Collectors.toMap(StateEntity::getCode, s -> s));

        List<StateEntity> reconciled = new ArrayList<>();

        for (State state : workflow.getStates()) {
            StateEntity se = existingByCode.get(state.code());
            if (se != null) {
                // Update in-place — keeps same JPA ID
                se.setName(state.name());
                se.setTerminal(state.terminal());
                reconciled.add(se);
            } else {
                // New state
                se = new StateEntity();
                se.setCode(state.code());
                se.setName(state.name());
                se.setTerminal(state.terminal());
                se.setWorkflow(existing);
                reconciled.add(se);
            }
        }
        existing.setStates(reconciled);

        // Resolve initial state reference
        String initialCode = workflow.getInitialState().code();
        StateEntity initialEntity = reconciled.stream()
                .filter(s -> s.getCode().equals(initialCode))
                .findFirst()
                .orElseThrow(() -> new IllegalStateException(
                        "Initial state '" + initialCode + "' not found in reconciled states"));
        existing.setInitialState(initialEntity);

        // Replace transitions entirely
        List<TransitionEntity> transitionEntities = workflow.getTransitions().stream()
                .map(t -> {
                    TransitionEntity te = new TransitionEntity();
                    te.setWorkflow(existing);
                    te.setFrom(findStateEntity(reconciled, t.getFrom().code()));
                    te.setTo(findStateEntity(reconciled, t.getTo().code()));
                    return te;
                })
                .toList();
        existing.setTransitions(transitionEntities);

        return existing;
    }

    private static StateEntity findStateEntity(List<StateEntity> states, String code) {
        return states.stream()
                .filter(s -> s.getCode().equals(code))
                .findFirst()
                .orElseThrow(() -> new IllegalStateException(
                        "State '" + code + "' not found in reconciled states"));
    }

}