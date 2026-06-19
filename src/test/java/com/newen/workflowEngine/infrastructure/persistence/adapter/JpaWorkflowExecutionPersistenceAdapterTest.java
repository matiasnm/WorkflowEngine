package com.newen.workflowEngine.infrastructure.persistence.adapter;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.context.annotation.Import;

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