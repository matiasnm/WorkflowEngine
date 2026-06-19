package com.newen.workflowEngine.application.facade;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.newen.workflowEngine.application.port.WorkflowExecutionRepository;
import com.newen.workflowEngine.application.port.WorkflowRepository;
import com.newen.workflowEngine.application.usecase.commands.dto.ExecuteTransitionResult;
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

    @Transactional
    public ExecuteTransitionResult transition(WorkflowExecutionId executionId, String targetStateCode) {
        
        Pair pair = loadExecutionAndWorkflow(executionId);

        State target = pair.workflow().getStates().stream()
                .filter(s -> s.code().equals(targetStateCode))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Invalid state code: " + targetStateCode));

        WorkflowEngine.TransitionResult result = engine.transition(pair.workflow(), pair.execution(), target);
        executionRepository.save(result.execution());

        return new ExecuteTransitionResult(
                result.execution().getId(),
                result.event().getFrom(),
                result.event().getTo(),
                result.event().getTimestamp()
        );
    }


    @Transactional(readOnly = true)
    public List<State> nextStates(WorkflowExecutionId executionId) {
        Pair pair = loadExecutionAndWorkflow(executionId);
        return pair.workflow().nextStates(pair.execution().getCurrentState());
    }


    @Transactional(readOnly = true)
    public boolean canTransition(WorkflowExecutionId executionId, String targetStateCode) {
        Pair pair = loadExecutionAndWorkflow(executionId);
        State target = pair.workflow().getStates().stream()
                .filter(s -> s.code().equals(targetStateCode))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Invalid state code: " + targetStateCode));
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
