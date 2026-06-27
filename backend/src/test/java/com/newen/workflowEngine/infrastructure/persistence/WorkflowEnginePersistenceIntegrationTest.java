package com.newen.workflowEngine.infrastructure.persistence;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

import com.newen.workflowEngine.application.port.WorkflowExecutionRepository;
import com.newen.workflowEngine.application.port.WorkflowRepository;
import com.newen.workflowEngine.domain.event.StateChanged;
import com.newen.workflowEngine.domain.model.execution.WorkflowExecution;
import com.newen.workflowEngine.domain.model.execution.WorkflowExecutionId;
import com.newen.workflowEngine.domain.model.workflow.State;
import com.newen.workflowEngine.domain.model.workflow.Transition;
import com.newen.workflowEngine.domain.model.workflow.Workflow;
import com.newen.workflowEngine.domain.model.workflow.WorkflowId;
import com.newen.workflowEngine.domain.service.WorkflowEngine;
import com.newen.workflowEngine.infrastructure.persistence.adapter.JpaWorkflowExecutionPersistenceAdapter;
import com.newen.workflowEngine.infrastructure.persistence.adapter.JpaWorkflowPersistenceAdapter;
import com.newen.workflowEngine.infrastructure.persistence.mapper.StateChangedMapper;
import com.newen.workflowEngine.infrastructure.persistence.mapper.WorkflowExecutionMapper;
import com.newen.workflowEngine.infrastructure.persistence.mapper.WorkflowMapper;

@DataJpaTest
@ActiveProfiles("h2")
@Import({
        JpaWorkflowPersistenceAdapter.class,
        JpaWorkflowExecutionPersistenceAdapter.class,
        WorkflowMapper.class,
        WorkflowExecutionMapper.class,
        StateChangedMapper.class,
})
class WorkflowEnginePersistenceIntegrationTest {

    @Autowired
    private WorkflowRepository workflowRepository;

    @Autowired
    private WorkflowExecutionRepository executionRepository;

    @Autowired
    private TestEntityManager em;

    @Test
    void should_execute_transition_and_persist_execution_and_event() {

        State created = new State("created", "CREATED", false);
        State review = new State("review", "REVIEW", false);
        State approved = new State("approved", "APPROVED", true);

        Workflow workflow = new Workflow(
                new WorkflowId(UUID.randomUUID()),
                "Admission Workflow",
                List.of(created, review, approved),
                List.of(
                        new Transition(created, review),
                        new Transition(review, approved)
                ),
                created
        );

        workflowRepository.save(workflow);

        Workflow loadedWorkflow =
                workflowRepository.findById(
                        workflow.getId()
                ).orElseThrow();

        WorkflowExecution execution =
                new WorkflowExecution(
                        new WorkflowExecutionId(UUID.randomUUID()),
                        loadedWorkflow.getId(),
                        created
                );

        WorkflowEngine engine = new WorkflowEngine();

        var result = engine.transition(
                loadedWorkflow,
                execution,
                review
        );

        executionRepository.save(result.execution());

        em.flush();
        em.clear();

        WorkflowExecution loadedExecution =
                executionRepository.findById(
                        execution.getId()
                ).orElseThrow();

        System.out.println(
            loadedExecution.getHistory().size());

        assertEquals(
                review,
                loadedExecution.getCurrentState()
        );

        assertEquals(
                1,
                loadedExecution.getHistory().size()
        );

        StateChanged storedEvent =
                loadedExecution.getHistory().getFirst();

        assertEquals(
                created,
                storedEvent.getFrom()
        );

        assertEquals(
                review,
                storedEvent.getTo()
        );

        assertEquals(
                execution.getId(),
                storedEvent.getExecutionId()
        );
    }

    @Test
    void should_not_duplicate_history_after_two_transitions() {

        State created = new State("created", "CREATED", false);
        State review = new State("review", "REVIEW", false);
        State approved = new State("approved", "APPROVED", true);

        Workflow workflow = new Workflow(
                new WorkflowId(UUID.randomUUID()),
                "Test Workflow",
                List.of(created, review, approved),
                List.of(
                        new Transition(created, review),
                        new Transition(review, approved)
                ),
                created
        );

        workflowRepository.save(workflow);

        Workflow loadedWorkflow =
                workflowRepository.findById(
                        workflow.getId()
                ).orElseThrow();

        WorkflowExecution execution =
                new WorkflowExecution(
                        new WorkflowExecutionId(UUID.randomUUID()),
                        loadedWorkflow.getId(),
                        created
                );

        WorkflowEngine engine = new WorkflowEngine();

        // ── First transition: created → review ──
        var firstResult = engine.transition(
                loadedWorkflow,
                execution,
                review
        );

        executionRepository.save(firstResult.execution());
        em.flush();
        em.clear();

        // Reload from DB so the second transition works on persisted data
        WorkflowExecution reloaded =
                executionRepository.findById(
                        execution.getId()
                ).orElseThrow();

        // ── Second transition: review → approved ──
        var secondResult = engine.transition(
                loadedWorkflow,
                reloaded,
                approved
        );

        executionRepository.save(secondResult.execution());
        em.flush();
        em.clear();

        // ── Reload and verify ──
        WorkflowExecution loadedExecution =
                executionRepository.findById(
                        execution.getId()
                ).orElseThrow();

        assertEquals(
                approved,
                loadedExecution.getCurrentState()
        );

        assertEquals(
                2,
                loadedExecution.getHistory().size(),
                "History must have exactly 2 entries – no duplicates after two transitions"
        );

        StateChanged firstEvent =
                loadedExecution.getHistory().get(0);
        StateChanged secondEvent =
                loadedExecution.getHistory().get(1);

        assertEquals(created, firstEvent.getFrom());
        assertEquals(review, firstEvent.getTo());

        assertEquals(review, secondEvent.getFrom());
        assertEquals(approved, secondEvent.getTo());
    }
}