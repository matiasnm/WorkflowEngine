package com.newen.workflowEngine.infrastructure.persistence.entity;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;

@Entity
@Table(name = "workflow_execution")
public class WorkflowExecutionEntity {

    @Id
    private UUID id;

    @ManyToOne
    @JoinColumn(name = "workflow_id")
    private WorkflowEntity workflow;

    @ManyToOne
    @JoinColumn(name = "current_state_id")
    private StateEntity currentState;

    @OneToMany(
        mappedBy = "execution",
        cascade = CascadeType.ALL,
        fetch = FetchType.LAZY
    )
    private List<StateChangedEntity> history = new ArrayList<>();

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public WorkflowEntity getWorkflow() {
        return workflow;
    }

    public void setWorkflow(WorkflowEntity workflow) {
        this.workflow = workflow;
    }

    public StateEntity getCurrentState() {
        return currentState;
    }

    public void setCurrentState(StateEntity currentState) {
        this.currentState = currentState;
    }

    public List<StateChangedEntity> getHistory() {
        return history;
    }

    public void setHistory(List<StateChangedEntity> history) {
        this.history = history;
    }
}