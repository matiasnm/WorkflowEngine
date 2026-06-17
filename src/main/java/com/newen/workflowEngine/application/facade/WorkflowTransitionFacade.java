package com.newen.workflowEngine.application.facade;

import java.util.List;

import org.springframework.stereotype.Service;

import com.newen.workflowEngine.application.port.WorkflowExecutionRepository;
import com.newen.workflowEngine.application.port.WorkflowRepository;
import com.newen.workflowEngine.application.usecase.commands.dto.ExecuteTransitionResult;
import com.newen.workflowEngine.domain.event.StateChanged;
import com.newen.workflowEngine.domain.exception.WorkflowExecutionNotFoundException;
import com.newen.workflowEngine.domain.exception.WorkflowNotFoundException;
import com.newen.workflowEngine.domain.model.execution.WorkflowExecution;
import com.newen.workflowEngine.domain.model.execution.WorkflowExecutionId;
import com.newen.workflowEngine.domain.model.workflow.State;
import com.newen.workflowEngine.domain.model.workflow.Workflow;
import com.newen.workflowEngine.domain.service.WorkflowEngine;
@Service
public class WorkflowTransitionFacade {

    private final WorkflowRepository workflowRepository;
    private final WorkflowExecutionRepository executionRepository;
    private final WorkflowEngine engine;

    public WorkflowTransitionFacade(
            WorkflowRepository workflowRepository,
            WorkflowExecutionRepository executionRepository,
            WorkflowEngine engine
    ) {
        this.workflowRepository = workflowRepository;
        this.executionRepository = executionRepository;
        this.engine = engine;
    }

    
    private record Pair(Workflow workflow, WorkflowExecution execution) {}

    
    public ExecuteTransitionResult transition(WorkflowExecutionId executionId, State target) {
        Pair pair = loadExecutionAndWorkflow(executionId);
        StateChanged event = engine.transition(pair.workflow(), pair.execution(), target);
        executionRepository.save(pair.execution());
        return new ExecuteTransitionResult(
                pair.execution().getId(),
                event.getFrom(),
                event.getTo(),
                event.getTimestamp()
        );
    }


    public List<State> nextStates(WorkflowExecutionId executionId) {
        Pair pair = loadExecutionAndWorkflow(executionId);
        return pair.workflow().nextStates(pair.execution().getCurrentState());
    }


    public boolean canTransition(WorkflowExecutionId executionId, State target) {
        Pair pair = loadExecutionAndWorkflow(executionId);
        return pair.workflow().allowsTransition(pair.execution().getCurrentState(), target);
    }


    private Pair loadExecutionAndWorkflow(WorkflowExecutionId executionId) {
        WorkflowExecution execution = executionRepository.findById(executionId)
                .orElseThrow(() -> new WorkflowExecutionNotFoundException("Execution not found"));
        Workflow workflow = workflowRepository.findById(execution.getWorkflowId())
                .orElseThrow(() -> new WorkflowNotFoundException("Workflow not found"));
        return new Pair(workflow, execution);
    }

}
