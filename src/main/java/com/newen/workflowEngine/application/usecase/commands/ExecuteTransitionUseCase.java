package com.newen.workflowEngine.application.usecase.commands;

import com.newen.workflowEngine.application.port.ExecutionRepository;
import com.newen.workflowEngine.application.port.WorkflowRepository;
import com.newen.workflowEngine.domain.event.StateChanged;
import com.newen.workflowEngine.domain.model.execution.WorkflowExecution;
import com.newen.workflowEngine.domain.model.execution.WorkflowExecutionId;
import com.newen.workflowEngine.domain.model.workflow.State;
import com.newen.workflowEngine.domain.model.workflow.Workflow;
import com.newen.workflowEngine.domain.service.WorkflowEngine;


public class ExecuteTransitionUseCase {

    private final WorkflowRepository workflowRepository;
    private final ExecutionRepository executionRepository;
    private final WorkflowEngine engine;

    public ExecuteTransitionUseCase(
            WorkflowRepository workflowRepository,
            ExecutionRepository executionRepository,
            WorkflowEngine engine
    ) {
        this.workflowRepository = workflowRepository;
        this.executionRepository = executionRepository;
        this.engine = engine;
    }

    public StateChanged execute(
            WorkflowExecutionId executionId,
            State target
    ) {

        WorkflowExecution execution =
                executionRepository.findById(executionId);

        Workflow workflow =
                workflowRepository.findById(execution.getWorkflowId());

        StateChanged event =
                engine.transition(workflow, execution, target);

        executionRepository.save(execution);

        return event;
    }
}