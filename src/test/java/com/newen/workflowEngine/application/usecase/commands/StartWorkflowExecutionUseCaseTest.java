package com.newen.workflowEngine.application.usecase.commands;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import org.junit.jupiter.api.Test;

import com.newen.workflowEngine.domain.model.execution.WorkflowExecution;
import com.newen.workflowEngine.domain.model.workflow.State;
import com.newen.workflowEngine.domain.model.workflow.Transition;
import com.newen.workflowEngine.domain.model.workflow.Workflow;
import com.newen.workflowEngine.domain.model.workflow.WorkflowId;
import com.newen.workflowEngine.infrastructure.persistence.repository.memory.InMemoryWorkflowExecutionRepository;
import com.newen.workflowEngine.infrastructure.persistence.repository.memory.InMemoryWorkflowRepository;

class StartWorkflowExecutionUseCaseTest {

    @Test
    void should_start_workflow_execution_with_initial_state() {

        State created = new State("created", "CREATED", false);
        State review = new State("review", "REVIEW", false);

        Workflow workflow = new Workflow(
                new WorkflowId(UUID.randomUUID()),
                "Workflow",
                List.of(created, review),
                List.of(new Transition(created, review)),
                created
        );

        InMemoryWorkflowRepository workflowRepo = new InMemoryWorkflowRepository();
        workflowRepo.save(workflow);

        InMemoryWorkflowExecutionRepository executionRepo = new InMemoryWorkflowExecutionRepository();

        StartWorkflowExecutionUseCase useCase =
                new StartWorkflowExecutionUseCase(workflowRepo, executionRepo);

        WorkflowExecution execution = useCase.execute(workflow.getId());

        assertEquals(created, execution.getCurrentState());
        assertEquals(workflow.getId(), execution.getWorkflowId());
    }

}