package com.newen.workflowEngine.infrastructure.persistence.entity;

import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "transition")
public class TransitionEntity {

    @Id
    @GeneratedValue
    @Column(updatable = false)
    private UUID id;

    @ManyToOne
    @JoinColumn(name = "workflow_id")
    private WorkflowEntity workflow;

    @ManyToOne
    @JoinColumn(name = "from_state_id")
    private StateEntity from;

    @ManyToOne
    @JoinColumn(name = "to_state_id")
    private StateEntity to;

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

    public StateEntity getFrom() {
        return from;
    }

    public void setFrom(StateEntity from) {
        this.from = from;
    }

    public StateEntity getTo() {
        return to;
    }

    public void setTo(StateEntity to) {
        this.to = to;
    }
}