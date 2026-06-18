package com.newen.workflowEngine.api.mapper;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

import com.newen.workflowEngine.api.dto.CreateWorkflowRequest;
import com.newen.workflowEngine.api.dto.StateRequest;
import com.newen.workflowEngine.domain.model.workflow.State;
import com.newen.workflowEngine.domain.model.workflow.Transition;

@Component
public class WorkflowRequestMapper {
    /**
     * Converts the web DTO into the four arguments the use case needs.
     * This is the one place where State identity-by-name is resolved.
     */
    public Map<String, State> buildStateMap(CreateWorkflowRequest request) {
        return request.states().stream()
                .collect(Collectors.toMap(
                        StateRequest::name,
                        s -> new State(s.name(), s.terminal())
                ));
    }
    public List<Transition> buildTransitions(
            CreateWorkflowRequest request,
            Map<String, State> statesByName
    ) {
        return request.transitions().stream()
                .map(t -> new Transition(
                        statesByName.get(t.from()),
                        statesByName.get(t.to())
                ))
                .toList();
    }
}