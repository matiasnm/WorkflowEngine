package com.newen.workflowEngine.infrastructure.event;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import com.newen.workflowEngine.application.port.EventPublisher;
import com.newen.workflowEngine.domain.event.StateChanged;

@Profile("memory")
@Component
public class LoggingEventPublisherAdapter implements EventPublisher {

    private static final Logger log = LoggerFactory.getLogger(LoggingEventPublisherAdapter.class);
    @Override

    public void publish(StateChanged event) {
        log.info("Domain event: {}", event);
    }

}