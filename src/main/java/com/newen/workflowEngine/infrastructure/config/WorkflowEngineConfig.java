package com.newen.workflowEngine.infrastructure.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.newen.workflowEngine.domain.service.WorkflowEngine;

@Configuration
public class WorkflowEngineConfig {

    @Bean
    public WorkflowEngine workflowEngine() {
        return new WorkflowEngine();
    }
}