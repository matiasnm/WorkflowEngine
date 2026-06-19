package com.newen.workflowEngine.infrastructure.persistence.repository.memory;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.newen.workflowEngine.domain.model.execution.WorkflowExecution;
import com.newen.workflowEngine.domain.model.execution.WorkflowExecutionId;
import com.newen.workflowEngine.domain.model.workflow.State;
import com.newen.workflowEngine.domain.model.workflow.WorkflowId;

class InMemoryWorkflowExecutionRepositoryTest {

    private InMemoryWorkflowExecutionRepository repository;

    private final WorkflowId workflowIdA = new WorkflowId(UUID.randomUUID());
    private final WorkflowId workflowIdB = new WorkflowId(UUID.randomUUID());
    private final State defaultState = new State("created", "CREATED", false);

    @BeforeEach
    void setUp() {
        repository = new InMemoryWorkflowExecutionRepository();
    }

    @Test
    void should_return_executions_for_given_workflowId() {
        // Arrange
        WorkflowExecution exec1 = new WorkflowExecution(
                new WorkflowExecutionId(UUID.randomUUID()), workflowIdA, defaultState
        );
        WorkflowExecution exec2 = new WorkflowExecution(
                new WorkflowExecutionId(UUID.randomUUID()), workflowIdA, defaultState
        );
        WorkflowExecution exec3 = new WorkflowExecution(
                new WorkflowExecutionId(UUID.randomUUID()), workflowIdB, defaultState
        );
        repository.save(exec1);
        repository.save(exec2);
        repository.save(exec3);

        // Act
        List<WorkflowExecution> result = repository.findByWorkflowId(workflowIdA);

        // Assert
        assertEquals(2, result.size());
        assertTrue(result.contains(exec1));
        assertTrue(result.contains(exec2));
    }

    @Test
    void should_return_empty_list_for_unknown_workflowId() {
        // Arrange
        WorkflowExecution exec = new WorkflowExecution(
                new WorkflowExecutionId(UUID.randomUUID()), workflowIdA, defaultState
        );
        repository.save(exec);

        // Act
        List<WorkflowExecution> result = repository.findByWorkflowId(
                new WorkflowId(UUID.randomUUID())
        );

        // Assert
        assertTrue(result.isEmpty());
    }

    @Test
    void should_return_empty_list_when_no_executions_exist() {
        // Act
        List<WorkflowExecution> result = repository.findByWorkflowId(workflowIdA);

        // Assert
        assertTrue(result.isEmpty());
    }
}
