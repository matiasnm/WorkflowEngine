package com.newen.workflowEngine.infrastructure.persistence.entity;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
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
    @Column(updatable = false)
    private UUID id;

    @ManyToOne
    @JoinColumn(name = "execution_id", nullable = false)
    private WorkflowExecutionEntity execution;

    @Column(name = "from_state_code", nullable = false)
    private String fromStateCode;

    @Column(name = "to_state_code", nullable = false)
    private String toStateCode;

    @Column(nullable = false)
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

    public Instant getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(Instant timestamp) {
        this.timestamp = timestamp;
    }

    public String getFromStateCode() {
        return fromStateCode;
    }

    public void setFromStateCode(String fromStateCode) {
        this.fromStateCode = fromStateCode;
    }

    public String getToStateCode() {
        return toStateCode;
    }

    public void setToStateCode(String toStateCode) {
        this.toStateCode = toStateCode;
    }

}