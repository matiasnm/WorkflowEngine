package com.newen.workflowEngine.infrastructure.persistence.repository.jpa;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;

import com.newen.workflowEngine.infrastructure.persistence.entity.StateEntity;
import com.newen.workflowEngine.infrastructure.persistence.entity.WorkflowEntity;
import com.newen.workflowEngine.infrastructure.persistence.entity.WorkflowExecutionEntity;

@DataJpaTest
class JpaWorkflowExecutionRepositoryTest {

    @Autowired
    private JpaWorkflowExecutionRepository executionRepo;

    @Autowired
    private JpaWorkflowRepository workflowRepo;

    @Test
    void should_find_executions_by_workflowId_workflowId() {
        // Arrange
        WorkflowEntity workflow = new WorkflowEntity();
        workflow.setId(UUID.randomUUID());
        workflow.setName("Test");
        StateEntity state = new StateEntity();
        state.setCode("created");
        state.setName("CREATED");
        state.setTerminal(false);
        state.setWorkflow(workflow);
        workflow.setInitialState(state);
        workflow.setStates(List.of(state));
        workflow.setTransitions(List.of());
        workflowRepo.save(workflow);

        WorkflowExecutionEntity exec1 = new WorkflowExecutionEntity();
        exec1.setId(UUID.randomUUID());
        exec1.setWorkflow(workflow);
        exec1.setCurrentStateCode("created");

        WorkflowExecutionEntity exec2 = new WorkflowExecutionEntity();
        exec2.setId(UUID.randomUUID());
        exec2.setWorkflow(workflow);
        exec2.setCurrentStateCode("created");

        executionRepo.save(exec1);
        executionRepo.save(exec2);

        // Act
        List<WorkflowExecutionEntity> results =
                executionRepo.findByWorkflow_Id(workflow.getId());

        // Assert
        assertEquals(2, results.size());
    }

    @Test
    void should_return_empty_list_when_no_executions() {
        // Act
        List<WorkflowExecutionEntity> results =
                executionRepo.findByWorkflow_Id(UUID.randomUUID());

        // Assert
        assertTrue(results.isEmpty());
    }
}
