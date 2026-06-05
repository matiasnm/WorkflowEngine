package com.newen.workflowEngine.domain.model.workflow;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import org.junit.jupiter.api.Test;

class WorkflowTest {

    @Test
    void should_create_valid_workflow() {

        State created = new State("CREATED", false);
        State review = new State("REVIEW", false);

        Workflow workflow = new Workflow(
                new WorkflowId(UUID.randomUUID()),
                "Test Workflow",
                List.of(created, review),
                List.of(
                        new Transition(created, review)
                ),
                created
        );

        assertNotNull(workflow);
        assertEquals(created, workflow.getInitialState());
        assertEquals(2, workflow.getStates().size());
        assertEquals(1, workflow.getTransitions().size());
    }

    @Test
    void should_fail_when_states_are_empty() {

        State created = new State("CREATED", false);

        assertThrows(
                IllegalArgumentException.class,
                () -> new Workflow(
                        new WorkflowId(UUID.randomUUID()),
                        "Invalid Workflow",
                        List.of(),
                        List.of(),
                        created
                )
        );
    }

    @Test
    void should_fail_when_initial_state_not_in_states() {

        State created = new State("CREATED", false);
        State review = new State("REVIEW", false);

        assertThrows(
                IllegalArgumentException.class,
                () -> new Workflow(
                        new WorkflowId(UUID.randomUUID()),
                        "Invalid Workflow",
                        List.of(review),
                        List.of(),
                        created
                )
        );
    }

    @Test
    void should_fail_when_duplicate_states_exist() {

        State created1 = new State("CREATED", false);
        State created2 = new State("CREATED", false);

        assertThrows(
                IllegalArgumentException.class,
                () -> new Workflow(
                        new WorkflowId(UUID.randomUUID()),
                        "Invalid Workflow",
                        List.of(created1, created2),
                        List.of(),
                        created1
                )
        );
    }

    @Test
    void should_fail_when_transition_has_unknown_from_state() {

        State created = new State("CREATED", false);
        State review = new State("REVIEW", false);
        State external = new State("EXTERNAL", false);

        assertThrows(
                IllegalArgumentException.class,
                () -> new Workflow(
                        new WorkflowId(UUID.randomUUID()),
                        "Invalid Workflow",
                        List.of(created, review),
                        List.of(
                                new Transition(external, review)
                        ),
                        created
                )
        );
    }

    @Test
    void should_fail_when_transition_has_unknown_to_state() {

        State created = new State("CREATED", false);
        State review = new State("REVIEW", false);
        State external = new State("EXTERNAL", false);

        assertThrows(
                IllegalArgumentException.class,
                () -> new Workflow(
                        new WorkflowId(UUID.randomUUID()),
                        "Invalid Workflow",
                        List.of(created, review),
                        List.of(
                                new Transition(created, external)
                        ),
                        created
                )
        );
    }

    @Test
    void should_fail_when_terminal_state_has_outgoing_transitions() {

        State created = new State("CREATED", false);
        State review = new State("REVIEW", false);
        State approved = new State("APPROVED", true);

        assertThrows(
                IllegalArgumentException.class,
                () -> new Workflow(
                        new WorkflowId(UUID.randomUUID()),
                        "Invalid Workflow",
                        List.of(created, review, approved),
                        List.of(
                                new Transition(approved, review)
                        ),
                        created
                )
        );
    }

    @Test
    void should_fail_when_duplicate_transitions_exist() {

        State created = new State("CREATED", false);
        State review = new State("REVIEW", false);

        assertThrows(
                IllegalArgumentException.class,
                () -> new Workflow(
                        new WorkflowId(UUID.randomUUID()),
                        "Invalid Workflow",
                        List.of(created, review),
                        List.of(
                                new Transition(created, review),
                                new Transition(created, review)
                        ),
                        created
                )
        );
    }
}