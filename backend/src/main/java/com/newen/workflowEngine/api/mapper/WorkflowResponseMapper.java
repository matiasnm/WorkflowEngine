package com.newen.workflowEngine.api.mapper;

import java.util.List;

import org.springframework.stereotype.Component;

import com.newen.workflowEngine.api.dto.StateResponse;
import com.newen.workflowEngine.api.dto.TransitionDefinitionResponse;
import com.newen.workflowEngine.api.dto.WorkflowDetailResponse;
import com.newen.workflowEngine.api.dto.WorkflowSummaryResponse;
import com.newen.workflowEngine.domain.model.workflow.Workflow;

@Component
public class WorkflowResponseMapper {

    public WorkflowSummaryResponse toSummary(Workflow workflow) {
        return new WorkflowSummaryResponse(
                workflow.getId().value(),
                workflow.getName(),
                workflow.getStates().size(),
                workflow.getTransitions().size()
        );
    }
    
    public WorkflowDetailResponse toDetail(Workflow workflow) {
        List<StateResponse> states = workflow.getStates().stream()
                .map(s -> new StateResponse(s.code(), s.name(), s.terminal()))
                .toList();
        List<TransitionDefinitionResponse> transitions = workflow.getTransitions().stream()
                .map(t -> new TransitionDefinitionResponse(t.getFrom().code(), t.getTo().code()))
                .toList();
        return new WorkflowDetailResponse(
                workflow.getId().value(),
                workflow.getName(),
                states,
                transitions,
                workflow.getInitialState().code()
        );
    }
}