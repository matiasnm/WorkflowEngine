package com.newen.workflowEngine.application.usecase.queries;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Test;

import com.newen.workflowEngine.domain.model.execution.WorkflowExecution;
import com.newen.workflowEngine.domain.model.execution.WorkflowExecutionId;
import com.newen.workflowEngine.domain.model.workflow.State;
import com.newen.workflowEngine.domain.model.workflow.WorkflowId;
import com.newen.workflowEngine.infrastructure.persistence.repository.memory.InMemoryWorkflowExecutionRepository;

class ListExecutionsUseCaseTest {

    @Test
    void should_return_all_executions_for_given_workflow() {
        // Arrange
        var executionRepo = new InMemoryWorkflowExecutionRepository();
        var useCase = new ListExecutionsUseCase(executionRepo);

        WorkflowId workflowId = new WorkflowId(UUID.randomUUID());
        State state = new State("created", "CREATED", false);

        executionRepo.save(new WorkflowExecution(
                new WorkflowExecutionId(UUID.randomUUID()), workflowId, state
        ));
        executionRepo.save(new WorkflowExecution(
                new WorkflowExecutionId(UUID.randomUUID()), workflowId, state
        ));

        // Act
        List<WorkflowExecution> results = useCase.execute(workflowId);

        // Assert
        assertEquals(2, results.size());
    }

    @Test
    void should_return_empty_list_when_no_executions() {
        // Arrange
        var executionRepo = new InMemoryWorkflowExecutionRepository();
        var useCase = new ListExecutionsUseCase(executionRepo);

        // Act
        List<WorkflowExecution> results = useCase.execute(
                new WorkflowId(UUID.randomUUID())
        );

        // Assert
        assertTrue(results.isEmpty());
    }
}
