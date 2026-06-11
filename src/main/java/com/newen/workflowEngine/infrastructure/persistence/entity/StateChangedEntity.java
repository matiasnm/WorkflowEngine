package com.newen.workflowEngine.infrastructure.persistence.entity;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "state_changed")
public class StateChangedEntity {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne
    @JoinColumn(name = "execution_id")
    private WorkflowExecutionEntity execution;

    @ManyToOne
    @JoinColumn(name = "from_state_id")
    private StateEntity from;

    @ManyToOne
    @JoinColumn(name = "to_state_id")
    private StateEntity to;

    private Instant timestamp;

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public WorkflowExecutionEntity getExecution() {
        return execution;
    }

    public void setExecution(WorkflowExecutionEntity execution) {
        this.execution = execution;
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

    public Instant getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(Instant timestamp) {
        this.timestamp = timestamp;
    }

}