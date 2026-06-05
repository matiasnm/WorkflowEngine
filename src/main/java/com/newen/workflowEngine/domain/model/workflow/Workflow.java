package com.newen.workflowEngine.domain.model.workflow;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

public class Workflow {
    private final WorkflowId id;
    private final String name;
    private final List<State> states;
    private final List<Transition> transitions;
    private final State initialState;

    public Workflow(
        WorkflowId id, 
        String name, 
        List<State> states, 
        List<Transition> transitions,
        State initialState) {
        
        validate(states, transitions, initialState);

        this.id = id;
        this.name = name;
        this.states = states;
        this.transitions = transitions;
        this.initialState = initialState;
    }

    private void validate(
            List<State> states,
            List<Transition> transitions,
            State initialState
    ) {

        // 1. al menos un estado
        if (states == null || states.isEmpty()) {
            throw new IllegalArgumentException("Workflow must have at least one state");
        }

        // 2. initial state pertenece a states
        if (!states.contains(initialState)) {
            throw new IllegalArgumentException(
                    "Initial state must belong to workflow states"
            );
        }

        // 3. estados duplicados
        Set<State> uniqueStates = new HashSet<>(states);
        if (uniqueStates.size() != states.size()) {
            throw new IllegalArgumentException("Duplicate states are not allowed");
        }

        // 4. transiciones duplicadas
        Set<String> seenTransitions = new HashSet<>();

        for (Transition transition : transitions) {

            // 5. from debe existir en states
            if (!states.contains(transition.getFrom())) {
                throw new IllegalArgumentException(
                        "Transition 'from' state is not part of workflow states: " + transition.getFrom()
                );
            }

            // 6. to debe existir en states
            if (!states.contains(transition.getTo())) {
                throw new IllegalArgumentException(
                        "Transition 'to' state is not part of workflow states: " + transition.getTo()
                );
            }

            // 7. estado terminal no puede ser origen
            if (transition.getFrom().terminal()) {
                throw new IllegalArgumentException(
                        "Terminal state cannot have outgoing transitions: " + transition.getFrom()
                );
            }

            // 8. no duplicar transiciones
            String key = transition.getFrom() + "->" + transition.getTo();
            if (!seenTransitions.add(key)) {
                throw new IllegalArgumentException(
                        "Duplicate transition detected: " + key
                );
            }
        }
    }

    public boolean allowsTransition(
        State from,
        State to
    ) {
        if (from.terminal()) {
            return false;
        }

        return transitions.stream()
                .anyMatch(t ->
                        t.getFrom().equals(from)
                        &&
                        t.getTo().equals(to)
                );
    }

    public WorkflowId getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public List<State> getStates() {
        return states;
    }

    public List<Transition> getTransitions() {
        return transitions;
    }

    public State getInitialState() {
        return initialState;
    }

    public List<State> nextStates(State current) {
        return transitions.stream()
                .filter(t -> t.getFrom().equals(current))
                .map(Transition::getTo)
                .toList();
    }

}