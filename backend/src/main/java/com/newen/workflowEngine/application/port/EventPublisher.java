package com.newen.workflowEngine.application.port;

import com.newen.workflowEngine.domain.event.StateChanged;

public interface EventPublisher {
    void publish(StateChanged event);
}