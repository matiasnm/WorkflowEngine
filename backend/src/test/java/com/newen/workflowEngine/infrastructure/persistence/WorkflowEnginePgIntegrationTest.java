package com.newen.workflowEngine.infrastructure.persistence;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

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

import jakarta.persistence.EntityManager;

/**
 * Integration test que valida el persistence layer completo (Workflow + Execution + History)
 * contra una base PostgreSQL real vía Testcontainers.
 * <p>
 * Conceptos clave demostrados:
 * <ul>
 *   <li>{@code @Testcontainers} — extensión de JUnit que gestiona el ciclo de vida del container</li>
 *   <li>{@code @Container} — declara el container (static = compartido entre tests, más rápido)</li>
 *   <li>{@code @DynamicPropertySource} — sobrescribe propiedades de Spring en tiempo real</li>
 *   <li>{@code @AutoConfigureTestDatabase(replace = NONE)} — evita que {@code @DataJpaTest}
 *       reemplace nuestra PostgreSQL con H2</li>
 *   <li>DDL automático: {@code spring.jpa.hibernate.ddl-auto=update} genera el schema
 *       directamente en PostgreSQL desde las entidades JPA</li>
 * </ul>
 */
@DataJpaTest
@ActiveProfiles("pg")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Testcontainers
@Import({
        JpaWorkflowPersistenceAdapter.class,
        JpaWorkflowExecutionPersistenceAdapter.class,
        WorkflowMapper.class,
        WorkflowExecutionMapper.class,
        StateChangedMapper.class,
})
class WorkflowEnginePgIntegrationTest {

    // ──────────────────────────────────────────────
    // Container PostgreSQL compartido (static)
    // ──────────────────────────────────────────────
    // static → un solo container para todos los tests del suite (más rápido).
    // PostgreSQLContainer es auto-start: arranca antes que cualquier @DynamicPropertySource.
    // 16-alpine → imagen liviana (~200 MB), suficiente para integración.
    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    // ──────────────────────────────────────────────
    // Sobrescribir datasource en runtime
    // ──────────────────────────────────────────────
    // @DynamicPropertySource se ejecuta DURANTE el context refresh de Spring,
    // justo después de que Testcontainers levantó el container.
    // Así Spring Data JPA apunta a PostgreSQL en vez de H2.
    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.datasource.driver-class-name", () -> "org.postgresql.Driver");
        registry.add("spring.jpa.database-platform", () -> "org.hibernate.dialect.PostgreSQLDialect");
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "update");
    }

    @Autowired
    private WorkflowRepository workflowRepository;

    @Autowired
    private WorkflowExecutionRepository executionRepository;

    @Autowired
    private TestEntityManager em;

    @Test
    void should_cascade_delete_workflow_to_states_and_transitions() {
        // ── Arrange ────────────────────────────────────
        State created = new State("created", "CREATED", false);
        State review  = new State("review", "REVIEW", false);

        Workflow workflow = new Workflow(
                new WorkflowId(UUID.randomUUID()),
                "Cascade Test Workflow",
                List.of(created, review),
                List.of(new Transition(created, review)),
                created
        );

        workflowRepository.save(workflow);
        em.flush();
        em.clear();

        // Verify data exists before delete
        var workflowId = workflow.getId().value();
        Long stateCount = (Long) em.getEntityManager()
                .createNativeQuery("SELECT COUNT(*) FROM state WHERE workflow_id = ?1")
                .setParameter(1, workflowId)
                .getSingleResult();
        assertEquals(2, stateCount, "Should have 2 states before delete");

        Long transitionCount = (Long) em.getEntityManager()
                .createNativeQuery("SELECT COUNT(*) FROM transition WHERE workflow_id = ?1")
                .setParameter(1, workflowId)
                .getSingleResult();
        assertEquals(1, transitionCount, "Should have 1 transition before delete");

        // ── Act: delete via repository (uses JPA CascadeType.ALL) ──
        workflowRepository.deleteById(workflow.getId());

        em.flush();
        em.clear();

        // ── Assert: cascade deleted states and transitions ──
        Long stateCountAfter = (Long) em.getEntityManager()
                .createNativeQuery("SELECT COUNT(*) FROM state WHERE workflow_id = ?1")
                .setParameter(1, workflowId)
                .getSingleResult();
        assertEquals(0, stateCountAfter, "States should be cascade-deleted");

        Long transitionCountAfter = (Long) em.getEntityManager()
                .createNativeQuery("SELECT COUNT(*) FROM transition WHERE workflow_id = ?1")
                .setParameter(1, workflowId)
                .getSingleResult();
        assertEquals(0, transitionCountAfter, "Transitions should be cascade-deleted");

        // Workflow itself should be gone
        assertFalse(workflowRepository.findById(workflow.getId()).isPresent(),
                "Workflow should be deleted");
    }

    @Test
    void should_cascade_delete_execution_to_state_changed_history() {
        // ── Arrange ────────────────────────────────────
        State created = new State("created", "CREATED", false);
        State review  = new State("review", "REVIEW", false);
        State approved = new State("approved", "APPROVED", true);

        Workflow workflow = new Workflow(
                new WorkflowId(UUID.randomUUID()),
                "Cascade Execution Test",
                List.of(created, review, approved),
                List.of(
                        new Transition(created, review),
                        new Transition(review, approved)
                ),
                created
        );

        workflowRepository.save(workflow);

        Workflow loadedWorkflow = workflowRepository
                .findById(workflow.getId())
                .orElseThrow();

        WorkflowExecution execution = new WorkflowExecution(
                new WorkflowExecutionId(UUID.randomUUID()),
                loadedWorkflow.getId(),
                created
        );

        // Execute a transition to create history
        WorkflowEngine engine = new WorkflowEngine();
        var result = engine.transition(loadedWorkflow, execution, review);
        executionRepository.save(result.execution());

        em.flush();
        em.clear();

        // Verify history exists before delete
        var executionId = execution.getId().value();
        Long historyCount = (Long) em.getEntityManager()
                .createNativeQuery("SELECT COUNT(*) FROM state_changed WHERE execution_id = ?1")
                .setParameter(1, executionId)
                .getSingleResult();
        assertEquals(1, historyCount, "Should have 1 history entry before delete");

        // ── Act: delete via repository (uses JPA CascadeType.ALL) ──
        executionRepository.deleteById(execution.getId());

        em.flush();
        em.clear();

        // ── Assert: cascade deleted state_changed rows ──
        Long historyCountAfter = (Long) em.getEntityManager()
                .createNativeQuery("SELECT COUNT(*) FROM state_changed WHERE execution_id = ?1")
                .setParameter(1, executionId)
                .getSingleResult();
        assertEquals(0, historyCountAfter, "State changed history should be cascade-deleted");

        // Execution itself should be gone
        assertFalse(executionRepository.findById(execution.getId()).isPresent(),
                "Execution should be deleted");

        // Workflow should still exist (execution cascade should not affect workflow)
        assertTrue(workflowRepository.findById(workflow.getId()).isPresent(),
                "Workflow should still exist after execution delete");
    }

    @Test
    void should_execute_transition_and_persist_execution_and_event_in_postgres() {

        // ── Arrange ────────────────────────────────────
        State created = new State("created", "CREATED", false);
        State review  = new State("review", "REVIEW", false);
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

        Workflow loadedWorkflow = workflowRepository
                .findById(workflow.getId())
                .orElseThrow();

        WorkflowExecution execution = new WorkflowExecution(
                new WorkflowExecutionId(UUID.randomUUID()),
                loadedWorkflow.getId(),
                created
        );

        // ── Act ────────────────────────────────────────
        WorkflowEngine engine = new WorkflowEngine();

        var result = engine.transition(loadedWorkflow, execution, review);

        executionRepository.save(result.execution());

        em.flush();
        em.clear();

        // ── Assert ─────────────────────────────────────
        WorkflowExecution loadedExecution = executionRepository
                .findById(execution.getId())
                .orElseThrow();

        assertEquals(review, loadedExecution.getCurrentState());
        assertEquals(1, loadedExecution.getHistory().size());

        StateChanged storedEvent = loadedExecution.getHistory().getFirst();

        assertEquals(created, storedEvent.getFrom());
        assertEquals(review, storedEvent.getTo());
        assertEquals(execution.getId(), storedEvent.getExecutionId());
    }
}
