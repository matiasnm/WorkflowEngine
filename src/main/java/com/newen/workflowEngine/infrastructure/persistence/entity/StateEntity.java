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
@Table(name = "state")
public class StateEntity {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(nullable = false, unique = true)
    private String code;
    
    private String name;

    private boolean terminal;

    @ManyToOne
    @JoinColumn(name = "workflow_id")
    private WorkflowEntity workflow;

    public UUID getId() {
        return id;
    }

    public String getCode() { 
        return code; 
    }

    public String getName() {
        return name;
    }

    public boolean isTerminal() {
        return terminal;
    }

    public WorkflowEntity getWorkflow() {
        return workflow;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public void setCode(String code) { 
        this.code = code; 
    }

    public void setName(String name) {
        this.name = name;
    }

    public void setTerminal(boolean terminal) {
        this.terminal = terminal;
    }

    public void setWorkflow(WorkflowEntity workflow) {
        this.workflow = workflow;
    }
}