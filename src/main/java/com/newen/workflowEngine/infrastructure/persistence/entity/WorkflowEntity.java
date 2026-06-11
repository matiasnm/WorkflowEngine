package com.newen.workflowEngine.infrastructure.persistence.entity;

import java.util.List;
import java.util.UUID;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;


@Entity
@Table(name = "workflow")
public class WorkflowEntity {

    @Id
    private UUID id;

    private String name;

    @ManyToOne
    @JoinColumn(name = "initial_state_id")
    private StateEntity initialState;

    @OneToMany(
    mappedBy = "workflow",
    cascade = CascadeType.ALL,
    orphanRemoval = true
    )
    private List<StateEntity> states;

    @OneToMany(
    mappedBy = "workflow",
    cascade = CascadeType.ALL,
    orphanRemoval = true
    )
    private List<TransitionEntity> transitions;

    public UUID getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public StateEntity getInitialState() {
        return initialState;
    }

    public List<StateEntity> getStates() {
        return states;
    }

    public List<TransitionEntity> getTransitions() {
        return transitions;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public void setName(String name) {
        this.name = name;
    }

    public void setInitialState(StateEntity initialState) {
        this.initialState = initialState;
    }

    public void setStates(List<StateEntity> states) {
        this.states = states;
    }

    public void setTransitions(List<TransitionEntity> transitions) {
        this.transitions = transitions;
    }
}