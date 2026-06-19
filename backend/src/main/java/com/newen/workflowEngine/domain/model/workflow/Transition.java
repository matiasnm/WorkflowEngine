package com.newen.workflowEngine.domain.model.workflow;

public class Transition {
    State from;
    State to;

    public State getFrom() {
        return from;
    }
    
    public State getTo() {
        return to;
    }

    public Transition(State from, State to) {
        this.from = from;
        this.to = to;
    }
}