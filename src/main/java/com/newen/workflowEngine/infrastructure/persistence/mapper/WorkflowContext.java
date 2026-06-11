package com.newen.workflowEngine.infrastructure.persistence.mapper;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import com.newen.workflowEngine.domain.exception.StateNotFoundInWorkflowException;
import com.newen.workflowEngine.domain.model.workflow.State;
import com.newen.workflowEngine.infrastructure.persistence.entity.StateEntity;
import com.newen.workflowEngine.infrastructure.persistence.entity.WorkflowEntity;

final class WorkflowContext {

    private final Map<String, State> statesByName;

    private WorkflowContext(Map<String, State> statesByName) {
        this.statesByName = statesByName;
    }

    static WorkflowContext from(WorkflowEntity entity) {

        Map<String, State> states = entity.getStates().stream()
                .collect(Collectors.toMap(
                        StateEntity::getName,
                        s -> new State(
                                s.getName(),
                                s.isTerminal()
                        )
                ));

        return new WorkflowContext(states);
    }

    State state(String name) {
        State state = statesByName.get(name);

        if (state == null) {
            throw new StateNotFoundInWorkflowException(name);
        }

        return state;
    }

    List<State> states() {
        return List.copyOf(statesByName.values());
    }
}