package com.newen.workflowEngine.application.usecase.commands;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;

import com.newen.workflowEngine.domain.event.StateChanged;
import com.newen.workflowEngine.domain.exception.WorkflowEditException;
import com.newen.workflowEngine.domain.exception.WorkflowNotFoundException;
import com.newen.workflowEngine.domain.model.execution.WorkflowExecution;
import com.newen.workflowEngine.domain.model.execution.WorkflowExecutionId;
import com.newen.workflowEngine.domain.model.workflow.State;
import com.newen.workflowEngine.domain.model.workflow.Transition;
import com.newen.workflowEngine.domain.model.workflow.Workflow;
import com.newen.workflowEngine.domain.model.workflow.WorkflowId;
import com.newen.workflowEngine.infrastructure.persistence.repository.memory.InMemoryWorkflowExecutionRepository;
import com.newen.workflowEngine.infrastructure.persistence.repository.memory.InMemoryWorkflowRepository;

class UpdateWorkflowUseCaseTest {

    // ── Happy paths ────────────────────────────────────────────────

    @Test
    void should_update_name_and_add_states_when_executions_exist() {
        State created = new State("created", "CREATED", false);
        State done = new State("done", "DONE", true);

        Workflow workflow = new Workflow(
                new WorkflowId(UUID.randomUUID()),
                "Original Name",
                List.of(created, done),
                List.of(new Transition(created, done)),
                created
        );

        WorkflowExecution execution = new WorkflowExecution(
                new WorkflowExecutionId(UUID.randomUUID()),
                workflow.getId(),
                done  // terminal state — no outgoing transitions to remove
        );

        InMemoryWorkflowRepository workflowRepo = new InMemoryWorkflowRepository();
        workflowRepo.save(workflow);

        InMemoryWorkflowExecutionRepository executionRepo = new InMemoryWorkflowExecutionRepository();
        executionRepo.save(execution);

        UpdateWorkflowUseCase useCase = new UpdateWorkflowUseCase(workflowRepo, executionRepo);

        State newCreated = new State("created", "CREATED", false);
        State newReview = new State("review", "REVIEW", false);
        State newDone = new State("done", "COMPLETED", true);

        Workflow updated = useCase.execute(
                workflow.getId(),
                "Updated Name",
                List.of(newCreated, newReview, newDone),
                List.of(
                        new Transition(newCreated, newReview),
                        new Transition(newReview, newDone)
                ),
                newCreated
        );

        assertEquals("Updated Name", updated.getName());
        assertEquals(3, updated.getStates().size());
        assertEquals(2, updated.getTransitions().size());
    }

    @Test
    void should_update_when_all_executions_are_terminal() {
        State created = new State("created", "CREATED", false);
        State done = new State("done", "DONE", true);

        Workflow workflow = new Workflow(
                new WorkflowId(UUID.randomUUID()),
                "Original Name",
                List.of(created, done),
                List.of(new Transition(created, done)),
                created
        );

        WorkflowExecution execution = new WorkflowExecution(
                new WorkflowExecutionId(UUID.randomUUID()),
                workflow.getId(),
                done  // terminal state
        );

        InMemoryWorkflowRepository workflowRepo = new InMemoryWorkflowRepository();
        workflowRepo.save(workflow);

        InMemoryWorkflowExecutionRepository executionRepo = new InMemoryWorkflowExecutionRepository();
        executionRepo.save(execution);

        UpdateWorkflowUseCase useCase = new UpdateWorkflowUseCase(workflowRepo, executionRepo);

        State newCreated = new State("created", "CREATED", false);
        State newReview = new State("review", "REVIEW", false);
        State newDone = new State("done", "COMPLETED", true);

        Workflow updated = useCase.execute(
                workflow.getId(),
                "Updated Name",
                List.of(newCreated, newReview, newDone),
                List.of(
                        new Transition(newCreated, newReview),
                        new Transition(newReview, newDone)
                ),
                newCreated
        );

        assertEquals("Updated Name", updated.getName());
        assertEquals(3, updated.getStates().size());
        assertEquals(2, updated.getTransitions().size());
    }

    // ── Removed state guard ────────────────────────────────────────

    @Test
    void should_block_removing_state_with_active_executions() {
        State created = new State("created", "CREATED", false);
        State review = new State("review", "REVIEW", false);
        State done = new State("done", "DONE", true);

        Workflow workflow = new Workflow(
                new WorkflowId(UUID.randomUUID()),
                "Workflow",
                List.of(created, review, done),
                List.of(
                        new Transition(created, review),
                        new Transition(review, done)
                ),
                created
        );

        WorkflowExecution execution = new WorkflowExecution(
                new WorkflowExecutionId(UUID.randomUUID()),
                workflow.getId(),
                review  // execution in 'review' state
        );

        InMemoryWorkflowRepository workflowRepo = new InMemoryWorkflowRepository();
        workflowRepo.save(workflow);

        InMemoryWorkflowExecutionRepository executionRepo = new InMemoryWorkflowExecutionRepository();
        executionRepo.save(execution);

        UpdateWorkflowUseCase useCase = new UpdateWorkflowUseCase(workflowRepo, executionRepo);

        // Remove 'review' state
        State newCreated = new State("created", "CREATED", false);
        State newDone = new State("done", "DONE", true);

        WorkflowEditException ex = assertThrows(WorkflowEditException.class,
                () -> useCase.execute(
                        workflow.getId(),
                        "Workflow",
                        List.of(newCreated, newDone),
                        List.of(new Transition(newCreated, newDone)),
                        newCreated
                ));

        assertTrue(ex.getViolations().stream()
                .anyMatch(v -> v.contains("review")));
    }

    @Test
    void should_block_removing_state_referenced_in_history() {
        State created = new State("created", "CREATED", false);
        State review = new State("review", "REVIEW", false);
        State done = new State("done", "DONE", true);

        Workflow workflow = new Workflow(
                new WorkflowId(UUID.randomUUID()),
                "Workflow",
                List.of(created, review, done),
                List.of(
                        new Transition(created, review),
                        new Transition(review, done)
                ),
                created
        );

        // Execution passed through 'review' but is now in 'done'
        WorkflowExecution execution = new WorkflowExecution(
                new WorkflowExecutionId(UUID.randomUUID()),
                workflow.getId(),
                done,
                List.of(new StateChanged(
                        new WorkflowExecutionId(UUID.randomUUID()),
                        workflow.getId(),
                        review, done, Instant.now())),
                null,
                null
        );

        InMemoryWorkflowRepository workflowRepo = new InMemoryWorkflowRepository();
        workflowRepo.save(workflow);

        InMemoryWorkflowExecutionRepository executionRepo = new InMemoryWorkflowExecutionRepository();
        executionRepo.save(execution);

        UpdateWorkflowUseCase useCase = new UpdateWorkflowUseCase(workflowRepo, executionRepo);

        // Remove 'review' — it's in history
        State newCreated = new State("created", "CREATED", false);
        State newDone = new State("done", "DONE", true);

        WorkflowEditException ex = assertThrows(WorkflowEditException.class,
                () -> useCase.execute(
                        workflow.getId(),
                        "Workflow",
                        List.of(newCreated, newDone),
                        List.of(new Transition(newCreated, newDone)),
                        newCreated
                ));

        assertTrue(ex.getViolations().stream()
                .anyMatch(v -> v.contains("review")));
    }

    @Test
    void should_allow_removing_state_with_no_referencing_executions() {
        State created = new State("created", "CREATED", false);
        State review = new State("review", "REVIEW", false);
        State done = new State("done", "DONE", true);

        Workflow workflow = new Workflow(
                new WorkflowId(UUID.randomUUID()),
                "Workflow",
                List.of(created, review, done),
                List.of(
                        new Transition(created, review),
                        new Transition(review, done)
                ),
                created
        );

        // No executions at all — safe to remove 'review'
        InMemoryWorkflowRepository workflowRepo = new InMemoryWorkflowRepository();
        workflowRepo.save(workflow);

        InMemoryWorkflowExecutionRepository executionRepo = new InMemoryWorkflowExecutionRepository();

        UpdateWorkflowUseCase useCase = new UpdateWorkflowUseCase(workflowRepo, executionRepo);

        State newCreated = new State("created", "CREATED", false);
        State newDone = new State("done", "DONE", true);

        Workflow updated = useCase.execute(
                workflow.getId(),
                "Workflow",
                List.of(newCreated, newDone),
                List.of(new Transition(newCreated, newDone)),
                newCreated
        );

        assertEquals(2, updated.getStates().size());
    }

    // ── Removed transition guard ───────────────────────────────────

    @Test
    void should_block_removing_transition_when_source_has_executions() {
        State created = new State("created", "CREATED", false);
        State review = new State("review", "REVIEW", false);
        State done = new State("done", "DONE", true);

        Workflow workflow = new Workflow(
                new WorkflowId(UUID.randomUUID()),
                "Workflow",
                List.of(created, review, done),
                List.of(
                        new Transition(created, review),
                        new Transition(review, done)
                ),
                created
        );

        WorkflowExecution execution = new WorkflowExecution(
                new WorkflowExecutionId(UUID.randomUUID()),
                workflow.getId(),
                review  // execution in 'review'
        );

        InMemoryWorkflowRepository workflowRepo = new InMemoryWorkflowRepository();
        workflowRepo.save(workflow);

        InMemoryWorkflowExecutionRepository executionRepo = new InMemoryWorkflowExecutionRepository();
        executionRepo.save(execution);

        UpdateWorkflowUseCase useCase = new UpdateWorkflowUseCase(workflowRepo, executionRepo);

        // Remove the 'review → done' transition (keep created → review)
        State newCreated = new State("created", "CREATED", false);
        State newReview = new State("review", "REVIEW", false);
        State newDone = new State("done", "DONE", true);

        WorkflowEditException ex = assertThrows(WorkflowEditException.class,
                () -> useCase.execute(
                        workflow.getId(),
                        "Workflow",
                        List.of(newCreated, newReview, newDone),
                        List.of(new Transition(newCreated, newReview)),  // no review→done
                        newCreated
                ));

        assertTrue(ex.getViolations().stream()
                .anyMatch(v -> v.contains("review") && v.contains("done")));
    }

    @Test
    void should_allow_removing_transition_when_source_has_no_executions() {
        State created = new State("created", "CREATED", false);
        State review = new State("review", "REVIEW", false);
        State done = new State("done", "DONE", true);

        Workflow workflow = new Workflow(
                new WorkflowId(UUID.randomUUID()),
                "Workflow",
                List.of(created, review, done),
                List.of(
                        new Transition(created, review),
                        new Transition(review, done)
                ),
                created
        );

        // Execution is in 'done' (terminal) — source 'review' is free
        WorkflowExecution execution = new WorkflowExecution(
                new WorkflowExecutionId(UUID.randomUUID()),
                workflow.getId(),
                done
        );

        InMemoryWorkflowRepository workflowRepo = new InMemoryWorkflowRepository();
        workflowRepo.save(workflow);

        InMemoryWorkflowExecutionRepository executionRepo = new InMemoryWorkflowExecutionRepository();
        executionRepo.save(execution);

        UpdateWorkflowUseCase useCase = new UpdateWorkflowUseCase(workflowRepo, executionRepo);

        State newCreated = new State("created", "CREATED", false);
        State newReview = new State("review", "REVIEW", false);
        State newDone = new State("done", "DONE", true);

        Workflow updated = useCase.execute(
                workflow.getId(),
                "Workflow",
                List.of(newCreated, newReview, newDone),
                List.of(new Transition(newCreated, newReview)),
                newCreated
        );

        assertEquals(1, updated.getTransitions().size());
    }

    // ── Terminal → non-terminal guard ──────────────────────────────

    @Test
    void should_block_changing_terminal_state_to_non_terminal_with_executions() {
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
                done  // in terminal state
        );

        InMemoryWorkflowRepository workflowRepo = new InMemoryWorkflowRepository();
        workflowRepo.save(workflow);

        InMemoryWorkflowExecutionRepository executionRepo = new InMemoryWorkflowExecutionRepository();
        executionRepo.save(execution);

        UpdateWorkflowUseCase useCase = new UpdateWorkflowUseCase(workflowRepo, executionRepo);

        // Try to make 'done' non-terminal (terminal=false) while keeping existing transition
        State newCreated = new State("created", "CREATED", false);
        State newDone = new State("done", "DONE", false);  // was true

        WorkflowEditException ex = assertThrows(WorkflowEditException.class,
                () -> useCase.execute(
                        workflow.getId(),
                        "Workflow",
                        List.of(newCreated, newDone),
                        List.of(new Transition(newCreated, newDone)),
                        newCreated
                ));

        assertTrue(ex.getViolations().stream()
                .anyMatch(v -> v.contains("done")));
    }

    // ── Auto-clear terminal ────────────────────────────────────────

    @Test
    void should_auto_clear_terminal_when_transition_added_from_terminal_state() {
        State created = new State("created", "CREATED", false);
        State done = new State("done", "DONE", true);

        Workflow workflow = new Workflow(
                new WorkflowId(UUID.randomUUID()),
                "Workflow",
                List.of(created, done),
                List.of(new Transition(created, done)),
                created
        );

        // Execution in 'done' — auto-clear will be blocked because of active execution
        // Use a scenario with no executions to test the auto-clear
        InMemoryWorkflowRepository workflowRepo = new InMemoryWorkflowRepository();
        workflowRepo.save(workflow);

        InMemoryWorkflowExecutionRepository executionRepo = new InMemoryWorkflowExecutionRepository();

        UpdateWorkflowUseCase useCase = new UpdateWorkflowUseCase(workflowRepo, executionRepo);

        // User sends 'done' as terminal=true BUT also adds a transition from done → created
        // Auto-clear should set terminal=false before domain validation
        State newCreated = new State("created", "CREATED", false);
        State newDone = new State("done", "DONE", true);  // user still says terminal

        Workflow updated = useCase.execute(
                workflow.getId(),
                "Workflow",
                List.of(newCreated, newDone),
                List.of(
                        new Transition(newCreated, newDone),
                        new Transition(newDone, newCreated)  // from terminal state!
                ),
                newCreated
        );

        // Auto-clear should have set 'done' to non-terminal
        State savedDone = updated.getStates().stream()
                .filter(s -> s.code().equals("done"))
                .findFirst().orElseThrow();
        assertEquals(false, savedDone.terminal());
    }

    @Test
    void should_block_auto_clear_when_terminal_state_has_active_executions() {
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
                done  // in terminal 'done' state
        );

        InMemoryWorkflowRepository workflowRepo = new InMemoryWorkflowRepository();
        workflowRepo.save(workflow);

        InMemoryWorkflowExecutionRepository executionRepo = new InMemoryWorkflowExecutionRepository();
        executionRepo.save(execution);

        UpdateWorkflowUseCase useCase = new UpdateWorkflowUseCase(workflowRepo, executionRepo);

        // User adds a transition from 'done' → 'created' — auto-clear triggers,
        // but 'done' has executions → should block
        State newCreated = new State("created", "CREATED", false);
        State newDone = new State("done", "DONE", true);

        WorkflowEditException ex = assertThrows(WorkflowEditException.class,
                () -> useCase.execute(
                        workflow.getId(),
                        "Workflow",
                        List.of(newCreated, newDone),
                        List.of(
                                new Transition(newCreated, newDone),
                                new Transition(newDone, newCreated)
                        ),
                        newCreated
                ));

        assertTrue(ex.getViolations().stream()
                .anyMatch(v -> v.contains("done") && v.contains("terminal")));
    }

    // ── NotFound ───────────────────────────────────────────────────

    @Test
    void should_throw_WorkflowNotFoundException_for_unknown_id() {
        InMemoryWorkflowRepository workflowRepo = new InMemoryWorkflowRepository();
        InMemoryWorkflowExecutionRepository executionRepo = new InMemoryWorkflowExecutionRepository();

        UpdateWorkflowUseCase useCase = new UpdateWorkflowUseCase(workflowRepo, executionRepo);

        State created = new State("created", "CREATED", false);

        assertThrows(WorkflowNotFoundException.class,
                () -> useCase.execute(
                        new WorkflowId(UUID.randomUUID()),
                        "Name",
                        List.of(created),
                        List.of(),
                        created
                ));
    }

    // ── Domain validation ──────────────────────────────────────────

    @Test
    void should_re_run_domain_validation() {
        State created = new State("created", "CREATED", false);
        State done = new State("done", "DONE", true);

        Workflow workflow = new Workflow(
                new WorkflowId(UUID.randomUUID()),
                "Workflow",
                List.of(created, done),
                List.of(new Transition(created, done)),
                created
        );

        InMemoryWorkflowRepository workflowRepo = new InMemoryWorkflowRepository();
        workflowRepo.save(workflow);

        InMemoryWorkflowExecutionRepository executionRepo = new InMemoryWorkflowExecutionRepository();

        UpdateWorkflowUseCase useCase = new UpdateWorkflowUseCase(workflowRepo, executionRepo);

        // initialState not in states list → should trigger domain validation
        State orphan = new State("orphan", "ORPHAN", false);

        assertThrows(IllegalArgumentException.class,
                () -> useCase.execute(
                        workflow.getId(),
                        "Name",
                        List.of(created, done),
                        List.of(),
                        orphan  // not in states list
                ));
    }
}
