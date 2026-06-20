package com.newen.workflowEngine.infrastructure.persistence.adapter;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

import com.newen.workflowEngine.application.port.WorkflowExecutionRepository;
import com.newen.workflowEngine.application.port.WorkflowRepository;
import com.newen.workflowEngine.domain.model.execution.WorkflowExecution;
import com.newen.workflowEngine.domain.model.execution.WorkflowExecutionId;
import com.newen.workflowEngine.domain.model.workflow.State;
import com.newen.workflowEngine.domain.model.workflow.Transition;
import com.newen.workflowEngine.domain.model.workflow.Workflow;
import com.newen.workflowEngine.domain.model.workflow.WorkflowId;
import com.newen.workflowEngine.infrastructure.persistence.mapper.StateChangedMapper;
import com.newen.workflowEngine.infrastructure.persistence.mapper.WorkflowExecutionMapper;
import com.newen.workflowEngine.infrastructure.persistence.mapper.WorkflowMapper;

@DataJpaTest
@ActiveProfiles("jpa")
@Import({
        JpaWorkflowExecutionPersistenceAdapter.class,
        WorkflowExecutionMapper.class,
        StateChangedMapper.class,
        WorkflowMapper.class,
        JpaWorkflowPersistenceAdapter.class
})
class JpaWorkflowExecutionPersistenceAdapterTest {

    @Autowired
    private WorkflowExecutionRepository executionRepository;

    @Autowired
    private WorkflowRepository workflowRepository;

    @Test
    void should_find_executions_by_workflowId() {
        // Arrange
        State created = new State("created", "CREATED", false);
        State review = new State("review", "REVIEW", false);

        Workflow workflow = new Workflow(
                new WorkflowId(UUID.randomUUID()),
                "Test Workflow",
                List.of(created, review),
                List.of(new Transition(created, review)),
                created
        );

        workflowRepository.save(workflow);
        Workflow loadedWorkflow =
                workflowRepository.findById(workflow.getId()).orElseThrow();

        WorkflowExecution exec1 = new WorkflowExecution(
                new WorkflowExecutionId(UUID.randomUUID()),
                loadedWorkflow.getId(),
                created
        );
        WorkflowExecution exec2 = new WorkflowExecution(
                new WorkflowExecutionId(UUID.randomUUID()),
                loadedWorkflow.getId(),
                created
        );

        executionRepository.save(exec1);
        executionRepository.save(exec2);

        // Act
        var results = executionRepository.findByWorkflowId(loadedWorkflow.getId());

        // Assert
        assertEquals(2, results.size());
    }

    @Test
    void should_return_empty_list_when_no_executions_for_workflowId() {
        // Arrange
        var unknownId = new WorkflowId(UUID.randomUUID());

        // Act
        var results = executionRepository.findByWorkflowId(unknownId);

        // Assert
        assertTrue(results.isEmpty());
    }

    @Test
    void should_persist_and_reconstruct_execution() {

        State created = new State("created", "CREATED", false);
        State review = new State("review", "REVIEW", false);

        Workflow workflow = new Workflow(
                new WorkflowId(UUID.randomUUID()),
                "Test Workflow",
                List.of(created, review),
                List.of(new Transition(created, review)),
                created
        );

        workflowRepository.save(workflow);

        Workflow loadedWorkflow =
                workflowRepository.findById(workflow.getId()).orElseThrow();

        WorkflowExecution execution =
                new WorkflowExecution(
                        new WorkflowExecutionId(UUID.randomUUID()),
                        loadedWorkflow.getId(),
                        created
                );

        executionRepository.save(execution);

        WorkflowExecution loaded =
                executionRepository.findById(execution.getId())
                        .orElseThrow();

        assertEquals(execution.getId(), loaded.getId());
        assertEquals(created, loaded.getCurrentState());
        assertEquals(0, loaded.getHistory().size());
    }
    
}