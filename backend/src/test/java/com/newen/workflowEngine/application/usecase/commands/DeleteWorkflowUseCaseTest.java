package com.newen.workflowEngine.application.usecase.commands;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;

import com.newen.workflowEngine.domain.exception.WorkflowHasExecutionsException;
import com.newen.workflowEngine.domain.exception.WorkflowNotFoundException;
import com.newen.workflowEngine.domain.model.execution.WorkflowExecution;
import com.newen.workflowEngine.domain.model.execution.WorkflowExecutionId;
import com.newen.workflowEngine.domain.model.workflow.State;
import com.newen.workflowEngine.domain.model.workflow.Transition;
import com.newen.workflowEngine.domain.model.workflow.Workflow;
import com.newen.workflowEngine.domain.model.workflow.WorkflowId;
import com.newen.workflowEngine.infrastructure.persistence.repository.memory.InMemoryWorkflowExecutionRepository;
import com.newen.workflowEngine.infrastructure.persistence.repository.memory.InMemoryWorkflowRepository;

class DeleteWorkflowUseCaseTest {

    @Test
    void should_delete_when_no_executions_exist() {
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

        DeleteWorkflowUseCase useCase = new DeleteWorkflowUseCase(workflowRepo, executionRepo);

        assertDoesNotThrow(() -> useCase.execute(workflow.getId()));
        assertFalse(workflowRepo.findById(workflow.getId()).isPresent());
    }

    @Test
    void should_throw_WorkflowHasExecutionsException_when_executions_exist() {
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
        executionRepo.save(new WorkflowExecution(
                new WorkflowExecutionId(UUID.randomUUID()),
                workflow.getId(),
                created
        ));

        DeleteWorkflowUseCase useCase = new DeleteWorkflowUseCase(workflowRepo, executionRepo);

        assertThrows(WorkflowHasExecutionsException.class,
                () -> useCase.execute(workflow.getId()));
        assertTrue(workflowRepo.findById(workflow.getId()).isPresent());
    }

    @Test
    void should_throw_WorkflowNotFoundException_for_unknown_id() {
        InMemoryWorkflowRepository workflowRepo = new InMemoryWorkflowRepository();
        InMemoryWorkflowExecutionRepository executionRepo = new InMemoryWorkflowExecutionRepository();

        DeleteWorkflowUseCase useCase = new DeleteWorkflowUseCase(workflowRepo, executionRepo);

        assertThrows(WorkflowNotFoundException.class,
                () -> useCase.execute(new WorkflowId(UUID.randomUUID())));
    }
}
