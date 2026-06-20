package com.newen.workflowEngine.infrastructure.event;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import com.newen.workflowEngine.application.port.EventPublisher;
import com.newen.workflowEngine.domain.event.StateChanged;

@Profile("!memory")
@Component
public class SpringEventPublisherAdapter implements EventPublisher {

    private final ApplicationEventPublisher publisher;

    public SpringEventPublisherAdapter(ApplicationEventPublisher publisher) {
        this.publisher = publisher;
    }
    
    @Override
    public void publish(StateChanged event) {
        publisher.publishEvent(event);
    }
}