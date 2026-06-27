package com.newen.workflowEngine.infrastructure.logging;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.context.annotation.Profile;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import com.newen.workflowEngine.domain.event.StateChanged;

@Profile({"!memory", "!dev-h2", "!dev"})
@Component
public class TransitionLoggingListener {

    private static final Logger log = LoggerFactory.getLogger(TransitionLoggingListener.class);

    @EventListener
    public void onStateChanged(StateChanged event) {
        try {
            MDC.put("executionId", event.getExecutionId().value().toString());
            MDC.put("workflowId", event.getWorkflowId().value().toString());
            MDC.put("fromState", event.getFrom().code());
            MDC.put("toState", event.getTo().code());
            log.info("State transition: {} → {}", event.getFrom().code(), event.getTo().code());
        } finally {
            MDC.remove("executionId");
            MDC.remove("workflowId");
            MDC.remove("fromState");
            MDC.remove("toState");
        }
    }
}
