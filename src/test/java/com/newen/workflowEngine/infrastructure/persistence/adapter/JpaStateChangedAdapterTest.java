package com.newen.workflowEngine.infrastructure.persistence.adapter;

import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.context.annotation.Import;

import com.newen.workflowEngine.application.port.ExecutionRepository;
import com.newen.workflowEngine.application.port.StateChangedRepository;
import com.newen.workflowEngine.application.port.WorkflowRepository;
import com.newen.workflowEngine.domain.event.StateChanged;
import com.newen.workflowEngine.domain.model.execution.WorkflowExecution;
import com.newen.workflowEngine.domain.model.execution.WorkflowExecutionId;
import com.newen.workflowEngine.domain.model.workflow.State;
import com.newen.workflowEngine.domain.model.workflow.Transition;
import com.newen.workflowEngine.domain.model.workflow.Workflow;
import com.newen.workflowEngine.domain.model.workflow.WorkflowId;
import com.newen.workflowEngine.infrastructure.persistence.mapper.ExecutionMapper;
import com.newen.workflowEngine.infrastructure.persistence.mapper.StateChangedMapper;
import com.newen.workflowEngine.infrastructure.persistence.mapper.WorkflowMapper;
import com.newen.workflowEngine.infrastructure.persistence.repository.jpa.JpaWorkflowEntityRepository;

@DataJpaTest
@Import({
        JpaStateChangedAdapter.class,
        StateChangedMapper.class,
        JpaExcecutionPersistenceAdapter.class,
        ExecutionMapper.class,
        WorkflowMapper.class,
        JpaWorkflowPersistenceAdapter.class,
        JpaWorkflowEntityRepository.class
})
class JpaStateChangedAdapterTest {

    @Autowired
    private StateChangedRepository stateChangedRepository;

    @Autowired
    private ExecutionRepository executionRepository;

    @Autowired
    private WorkflowRepository workflowRepository;

    @Test
    void should_persist_state_changed_event() {

        State created = new State("CREATED", false);
        State review = new State("REVIEW", false);

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

        StateChanged event =
                new StateChanged(
                        execution.getId(),
                        created,
                        review,
                        java.time.Instant.now()
                );

        stateChangedRepository.save(event);

    }
}