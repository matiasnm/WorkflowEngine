package com.newen.workflowEngine.infrastructure.persistence.repository.memory;

import java.util.ArrayList;
import java.util.List;

import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Repository;

import com.newen.workflowEngine.application.port.StateChangedRepository;
import com.newen.workflowEngine.domain.event.StateChanged;

@Profile("memory")
@Repository
public class InMemoryStateChangedRepository
        implements StateChangedRepository {

    private final List<StateChanged> events =
            new ArrayList<>();

    @Override
    public void save(StateChanged event) {
        events.add(event);
    }

}