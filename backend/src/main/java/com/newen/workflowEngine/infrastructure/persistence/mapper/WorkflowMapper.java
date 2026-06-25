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
                .collect(Collectors.toList());

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

        // ── Reconcile states in-place ──
        // Build set of incoming state codes so we can remove any state that no longer exists.
        java.util.Set<String> incomingCodes = workflow.getStates().stream()
                .map(State::code)
                .collect(Collectors.toSet());

        // Remove states whose code is NOT in the incoming set → orphan removal deletes them
        existing.getStates().removeIf(se -> !incomingCodes.contains(se.getCode()));

        // Index remaining (still-managed) states by code for fast lookup
        Map<String, StateEntity> existingByCode = existing.getStates().stream()
                .collect(Collectors.toMap(StateEntity::getCode, s -> s));

        // Update existing states in-place and add new ones to the managed collection
        for (State state : workflow.getStates()) {
            StateEntity se = existingByCode.get(state.code());
            if (se != null) {
                // Update in-place — keeps same JPA ID, Hibernate tracks the change
                se.setName(state.name());
                se.setTerminal(state.terminal());
            } else {
                // New state — add directly to the managed collection
                se = new StateEntity();
                se.setCode(state.code());
                se.setName(state.name());
                se.setTerminal(state.terminal());
                se.setWorkflow(existing);
                existing.getStates().add(se);
            }
        }

        // ── Resolve initial state ──
        String initialCode = workflow.getInitialState().code();
        StateEntity initialEntity = existing.getStates().stream()
                .filter(s -> s.getCode().equals(initialCode))
                .findFirst()
                .orElseThrow(() -> new IllegalStateException(
                        "Initial state '" + initialCode + "' not found in reconciled states"));
        existing.setInitialState(initialEntity);

        // ── Replace transitions entirely ──
        // Clear the managed collection first (orphan removal deletes removed transitions),
        // then add each new transition to the SAME collection (never replace the reference).
        existing.getTransitions().clear();
        for (Transition t : workflow.getTransitions()) {
            TransitionEntity te = new TransitionEntity();
            te.setWorkflow(existing);
            te.setFrom(findStateEntity(existing.getStates(), t.getFrom().code()));
            te.setTo(findStateEntity(existing.getStates(), t.getTo().code()));
            existing.getTransitions().add(te);
        }

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