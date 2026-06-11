package com.newen.workflowEngine.application.port;

import com.newen.workflowEngine.domain.event.StateChanged;

public interface StateChangedRepository {
        
    void save(StateChanged event);

}