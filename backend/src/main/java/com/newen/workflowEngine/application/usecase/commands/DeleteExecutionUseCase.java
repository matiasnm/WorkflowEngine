package com.newen.workflowEngine.application.usecase.commands;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.newen.workflowEngine.application.port.WorkflowExecutionRepository;
import com.newen.workflowEngine.application.port.WorkflowRepository;
import com.newen.workflowEngine.domain.exception.ExecutionNotTerminalException;
import com.newen.workflowEngine.domain.exception.WorkflowExecutionNotFoundException;
import com.newen.workflowEngine.domain.exception.WorkflowNotFoundException;
import com.newen.workflowEngine.domain.model.execution.WorkflowExecution;
import com.newen.workflowEngine.domain.model.execution.WorkflowExecutionId;
import com.newen.workflowEngine.domain.model.workflow.State;
import com.newen.workflowEngine.domain.model.workflow.Workflow;

@Service
public class DeleteExecutionUseCase {

    private final WorkflowExecutionRepository executionRepository;
    private final WorkflowRepository workflowRepository;

    public DeleteExecutionUseCase(
            WorkflowExecutionRepository executionRepository,
            WorkflowRepository workflowRepository
    ) {
        this.executionRepository = executionRepository;
        this.workflowRepository = workflowRepository;
    }

    @Transactional
    public void execute(WorkflowExecutionId executionId) {
        WorkflowExecution execution = executionRepository.findById(executionId)
            .orElseThrow(() -> new WorkflowExecutionNotFoundException("Execution not found"));

        Workflow workflow = workflowRepository.findById(execution.getWorkflowId())
            .orElseThrow(() -> new WorkflowNotFoundException("Workflow not found"));

        boolean isTerminal = workflow.getStates().stream()
            .filter(s -> s.code().equals(execution.getCurrentState().code()))
            .findFirst()
            .map(State::terminal)
            .orElse(false);

        if (!isTerminal) {
            throw new ExecutionNotTerminalException(
                "Cannot delete a non-terminal execution");
        }

        executionRepository.deleteById(executionId);
    }
}
