package com.newen.workflowEngine.infrastructure.repository.memory;

import java.util.ArrayList;
import java.util.List;

import com.newen.workflowEngine.application.port.StateChangedRepository;
import com.newen.workflowEngine.domain.event.StateChanged;
import com.newen.workflowEngine.domain.model.execution.WorkflowExecutionId;

public class InMemoryStateChangedRepository
        implements StateChangedRepository {

    private final List<StateChanged> events =
            new ArrayList<>();

    @Override
    public void save(StateChanged event) {
        events.add(event);
    }

    @Override
    public List<StateChanged> findByWorkflowExecutionId(
            WorkflowExecutionId executionId
    ) {
        return events.stream()
                .filter(e ->
                        e.getExecutionId()
                                .equals(executionId)
                )
                .toList();
    }
}