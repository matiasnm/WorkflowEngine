package com.newen.workflowEngine.domain.service;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Test;

import com.newen.workflowEngine.domain.event.StateChanged;
import com.newen.workflowEngine.domain.exception.InvalidTransitionException;
import com.newen.workflowEngine.domain.model.execution.WorkflowExecution;
import com.newen.workflowEngine.domain.model.execution.WorkflowExecutionId;
import com.newen.workflowEngine.domain.model.workflow.State;
import com.newen.workflowEngine.domain.model.workflow.Transition;
import com.newen.workflowEngine.domain.model.workflow.Workflow;
import com.newen.workflowEngine.domain.model.workflow.WorkflowId;

public class WorkflowEngineTest {
    
    @Test
    void should_transition_to_next_valid_state_and_record_event() {

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

        WorkflowExecution execution = new WorkflowExecution(
                new WorkflowExecutionId(UUID.randomUUID()),
                workflow.getId(),
                created
        );

        WorkflowEngine engine = new WorkflowEngine();

        var result = engine.transition(workflow, execution, review);

        assertEquals(review, result.execution().getCurrentState());

        assertEquals(created, result.event().getFrom());
        assertEquals(review, result.event().getTo());

        assertEquals(1, result.execution().getHistory().size());

        StateChanged storedEvent =
                result.execution().getHistory().getFirst();

        assertEquals(created, storedEvent.getFrom());
        assertEquals(review, storedEvent.getTo());
    }


    @Test
    void should_throw_exception_when_transition_is_not_allowed() {

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

        WorkflowExecution execution = new WorkflowExecution(
                new WorkflowExecutionId(UUID.randomUUID()),
                workflow.getId(),
                created
        );

        WorkflowEngine engine = new WorkflowEngine();

        assertThrows(
                InvalidTransitionException.class,
                () -> engine.transition(
                        workflow,
                        execution,
                        approved
                )
        );

        assertEquals(created, execution.getCurrentState());

        assertTrue(execution.getHistory().isEmpty());
    }


    @Test
    void should_not_allow_transition_from_terminal_state() {

        State created = new State("created", "CREATED", false);
        State review = new State("review", "REVIEW", false);
        State approved = new State("approved", "APPROVED", true);

        Workflow workflow = new Workflow(
                new WorkflowId(UUID.randomUUID()),
                "Workflow",
                List.of(created, review, approved),
                List.of(
                        new Transition(created, review),
                        new Transition(review, approved)
                ),
                created
        );

        WorkflowExecution execution = new WorkflowExecution(
                new WorkflowExecutionId(UUID.randomUUID()),
                workflow.getId(),
                approved // estado terminal
        );

        WorkflowEngine engine = new WorkflowEngine();

        assertThrows(
                InvalidTransitionException.class,
                () -> engine.transition(workflow, execution, review)
        );

        assertEquals(approved, execution.getCurrentState());
        assertTrue(execution.getHistory().isEmpty());
    }


    @Test
    void should_support_multiple_sequential_transitions() {

        State created = new State("created", "CREATED", false);
        State review = new State("review", "REVIEW", false);
        State approved = new State("approved", "APPROVED", true);

        Workflow workflow = new Workflow(
                new WorkflowId(UUID.randomUUID()),
                "Workflow",
                List.of(created, review, approved),
                List.of(
                        new Transition(created, review),
                        new Transition(review, approved)
                ),
                created
        );

        WorkflowExecution execution = new WorkflowExecution(
                new WorkflowExecutionId(UUID.randomUUID()),
                workflow.getId(),
                created
        );

        WorkflowEngine engine = new WorkflowEngine();

        var firstResult = engine.transition(workflow, execution, review);
        var secondResult = engine.transition(workflow, firstResult.execution(), approved);

        assertEquals(approved, secondResult.execution().getCurrentState());
        assertEquals(2, secondResult.execution().getHistory().size());

        StateChanged first = secondResult.execution().getHistory().get(0);
        StateChanged second = secondResult.execution().getHistory().get(1);

        assertEquals(created, first.getFrom());
        assertEquals(review, first.getTo());

        assertEquals(review, second.getFrom());
        assertEquals(approved, second.getTo());
    }

}