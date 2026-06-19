package com.newen.workflowEngine.infrastructure.persistence;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager;
import org.springframework.context.annotation.Import;
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
