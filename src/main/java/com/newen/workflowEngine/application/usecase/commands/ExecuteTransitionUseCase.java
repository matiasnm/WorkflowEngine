package com.newen.workflowEngine.application.usecase.commands;

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
public class ExecuteTransitionUseCase {

    private final WorkflowRepository workflowRepository;
    private final WorkflowExecutionRepository executionRepository;
    private final WorkflowEngine engine;

    public ExecuteTransitionUseCase(
            WorkflowRepository workflowRepository,
            WorkflowExecutionRepository executionRepository,
            WorkflowEngine engine
    ) {
        this.workflowRepository = workflowRepository;
        this.executionRepository = executionRepository;
        this.engine = engine;
    }

    public ExecuteTransitionResult execute(
            WorkflowExecutionId executionId,
            State target
    ) {

        WorkflowExecution execution =
                executionRepository.findById(executionId)
                .orElseThrow(() -> new WorkflowExecutionNotFoundException("Execution not found"));

        Workflow workflow =
                workflowRepository.findById(execution.getWorkflowId())
                .orElseThrow(() -> new WorkflowNotFoundException("Workflow not found"));

        StateChanged event =
                engine.transition(workflow, execution, target);

        executionRepository.save(execution);
        
        ExecuteTransitionResult result = new ExecuteTransitionResult(
                execution.getId(),
                event.getFrom(),
                event.getTo(),
                event.getTimestamp()
        );

        return result;
    }
}