package com.newen.workflowEngine.infrastructure.persistence.repository.jpa;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.newen.workflowEngine.infrastructure.persistence.entity.StateChangedEntity;

public interface JpaStateChangedRepository
        extends JpaRepository<StateChangedEntity, UUID> { }