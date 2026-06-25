package com.newen.workflowEngine.infrastructure.persistence.mapper;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import com.newen.workflowEngine.domain.exception.StateNotFoundInWorkflowException;
import com.newen.workflowEngine.domain.model.workflow.State;
import com.newen.workflowEngine.infrastructure.persistence.entity.StateEntity;
import com.newen.workflowEngine.infrastructure.persistence.entity.WorkflowEntity;

final class WorkflowContext {

    private final Map<String, State> statesByCode;

    private WorkflowContext(Map<String, State> statesByName) {
        this.statesByCode = statesByName;
    }

    static WorkflowContext from(WorkflowEntity entity) {
        Map<String, State> states = entity.getStates().stream()
            .collect(Collectors.toMap(
                    StateEntity::getCode,
                    s -> new State(s.getCode(), s.getName(), s.isTerminal()),
                    (a, b) -> a,
                    LinkedHashMap::new
            ));
        return new WorkflowContext(states);
    }


    State state(String code) {
        State state = statesByCode.get(code);
        if (state == null) throw new StateNotFoundInWorkflowException(code);
        return state;
    }

    List<State> states() {
        return List.copyOf(statesByCode.values());
    }
}