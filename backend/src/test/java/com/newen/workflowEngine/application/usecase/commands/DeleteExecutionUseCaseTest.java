package com.newen.workflowEngine.application.usecase.commands;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;

import com.newen.workflowEngine.domain.exception.ExecutionNotTerminalException;
import com.newen.workflowEngine.domain.exception.WorkflowExecutionNotFoundException;
import com.newen.workflowEngine.domain.model.execution.WorkflowExecution;
import com.newen.workflowEngine.domain.model.execution.WorkflowExecutionId;
import com.newen.workflowEngine.domain.model.workflow.State;
import com.newen.workflowEngine.domain.model.workflow.Transition;
import com.newen.workflowEngine.domain.model.workflow.Workflow;
import com.newen.workflowEngine.domain.model.workflow.WorkflowId;
import com.newen.workflowEngine.infrastructure.persistence.repository.memory.InMemoryWorkflowExecutionRepository;
import com.newen.workflowEngine.infrastructure.persistence.repository.memory.InMemoryWorkflowRepository;

class DeleteExecutionUseCaseTest {

    @Test
    void should_delete_when_execution_is_in_terminal_state() {
        State created = new State("created", "CREATED", false);
        State done = new State("done", "DONE", true);

        Workflow workflow = new Workflow(
                new WorkflowId(UUID.randomUUID()),
                "Workflow",
                List.of(created, done),
                List.of(new Transition(created, done)),
                created
        );

        WorkflowExecution execution = new WorkflowExecution(
                new WorkflowExecutionId(UUID.randomUUID()),
                workflow.getId(),
                done
        );

        InMemoryWorkflowRepository workflowRepo = new InMemoryWorkflowRepository();
        workflowRepo.save(workflow);

        InMemoryWorkflowExecutionRepository executionRepo = new InMemoryWorkflowExecutionRepository();
        executionRepo.save(execution);

        DeleteExecutionUseCase useCase = new DeleteExecutionUseCase(executionRepo, workflowRepo);

        assertDoesNotThrow(() -> useCase.execute(execution.getId()));
        assertFalse(executionRepo.findById(execution.getId()).isPresent());
    }

    @Test
    void should_throw_ExecutionNotTerminalException_when_not_terminal() {
        State created = new State("created", "CREATED", false);
        State done = new State("done", "DONE", true);

        Workflow workflow = new Workflow(
                new WorkflowId(UUID.randomUUID()),
                "Workflow",
                List.of(created, done),
                List.of(new Transition(created, done)),
                created
        );

        WorkflowExecution execution = new WorkflowExecution(
                new WorkflowExecutionId(UUID.randomUUID()),
                workflow.getId(),
                created  // non-terminal state
        );

        InMemoryWorkflowRepository workflowRepo = new InMemoryWorkflowRepository();
        workflowRepo.save(workflow);

        InMemoryWorkflowExecutionRepository executionRepo = new InMemoryWorkflowExecutionRepository();
        executionRepo.save(execution);

        DeleteExecutionUseCase useCase = new DeleteExecutionUseCase(executionRepo, workflowRepo);

        assertThrows(ExecutionNotTerminalException.class,
                () -> useCase.execute(execution.getId()));
        assertTrue(executionRepo.findById(execution.getId()).isPresent());
    }

    @Test
    void should_throw_WorkflowExecutionNotFoundException_for_unknown_id() {
        State created = new State("created", "CREATED", true);
        Workflow workflow = new Workflow(
                new WorkflowId(UUID.randomUUID()),
                "Workflow",
                List.of(created),
                List.of(),
                created
        );

        InMemoryWorkflowRepository workflowRepo = new InMemoryWorkflowRepository();
        workflowRepo.save(workflow);

        InMemoryWorkflowExecutionRepository executionRepo = new InMemoryWorkflowExecutionRepository();

        DeleteExecutionUseCase useCase = new DeleteExecutionUseCase(executionRepo, workflowRepo);

        assertThrows(WorkflowExecutionNotFoundException.class,
                () -> useCase.execute(new WorkflowExecutionId(UUID.randomUUID())));
    }
}
