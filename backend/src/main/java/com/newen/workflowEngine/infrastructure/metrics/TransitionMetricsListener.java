package com.newen.workflowEngine.infrastructure.metrics;

import org.springframework.context.annotation.Profile;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import com.newen.workflowEngine.domain.event.StateChanged;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
@Profile("!memory")
@Component
public class TransitionMetricsListener {

     private final MeterRegistry registry;

    public TransitionMetricsListener(MeterRegistry registry) {
        this.registry = registry;
    }

    @EventListener
    public void onStateChanged(StateChanged event) {
        Counter.builder("workflow.transitions.total")
            .tag("workflow_id", event.getWorkflowId().value().toString())
            .tag("from_state", event.getFrom().code())
            .tag("to_state", event.getTo().code())
            .register(registry)
            .increment();
    }

}