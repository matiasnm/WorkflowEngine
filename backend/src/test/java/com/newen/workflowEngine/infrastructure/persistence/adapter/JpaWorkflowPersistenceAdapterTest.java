package com.newen.workflowEngine.infrastructure.persistence.adapter;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.context.annotation.Import;

import com.newen.workflowEngine.application.port.WorkflowRepository;
import com.newen.workflowEngine.domain.model.workflow.State;
import com.newen.workflowEngine.domain.model.workflow.Transition;
import com.newen.workflowEngine.domain.model.workflow.Workflow;
import com.newen.workflowEngine.domain.model.workflow.WorkflowId;
import com.newen.workflowEngine.infrastructure.persistence.mapper.WorkflowMapper;


@DataJpaTest
@Import({
        JpaWorkflowPersistenceAdapter.class,
        WorkflowMapper.class
})
public class JpaWorkflowPersistenceAdapterTest {

    @Autowired
    private WorkflowRepository workflowRepository;

    @Test
    void should_persist_and_reconstruct_workflow() {

        State created = new State("created", "CREATED", false);
        State review = new State("review", "REVIEW", false);
        State approved = new State("approved", "APPROVED", true);

        Workflow workflow = new Workflow(
                new WorkflowId(UUID.randomUUID()),
                "Admission Workflow",
                List.of(
                        created,
                        review,
                        approved
                ),
                List.of(
                        new Transition(created, review),
                        new Transition(review, approved)
                ),
                created
        );

        workflowRepository.save(workflow);

        Workflow loaded =
                workflowRepository.findById(
                                workflow.getId()
                        )
                        .orElseThrow();

        assertEquals(
                workflow.getId(),
                loaded.getId()
        );

        assertEquals(
                workflow.getName(),
                loaded.getName()
        );

        assertEquals(
                3,
                loaded.getStates().size()
        );

        assertEquals(
                2,
                loaded.getTransitions().size()
        );

        assertEquals(
                "CREATED",
                loaded.getInitialState().name()
        );
    }
}