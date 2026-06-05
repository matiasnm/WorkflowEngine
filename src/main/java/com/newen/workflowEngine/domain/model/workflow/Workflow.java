package com.newen.workflowEngine.domain.model.workflow;

import java.util.List;

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
        
        validateTransitions(states, transitions, initialState);

        this.id = id;
        this.name = name;
        this.states = states;
        this.transitions = transitions;
        this.initialState = initialState;
    }

    private void validateTransitions(List<State> states, List<Transition> transitions, State initialState) {
        
        //Hay estados definidos que no son alcanzables.?

        if (!states.contains(initialState)) {
            throw new IllegalArgumentException(
            "Initial state must belong to workflow states"
            );
}
        for (Transition transition : transitions) {
            if (!states.contains(transition.getFrom())) {
                throw new IllegalArgumentException(
                    String.format("Transition from state '%s' is not valid because it is not in the list of states.", transition.getFrom())
                );
            }
            if (!states.contains(transition.getTo())) {
                throw new IllegalArgumentException(
                    String.format("Transition to state '%s' is not valid because it is not in the list of states.", transition.getTo())
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