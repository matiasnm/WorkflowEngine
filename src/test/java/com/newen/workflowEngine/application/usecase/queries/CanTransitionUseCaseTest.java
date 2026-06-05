package com.newen.workflowEngine.application.usecase.queries;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Test;

import com.newen.workflowEngine.domain.model.execution.WorkflowExecution;
import com.newen.workflowEngine.domain.model.execution.WorkflowExecutionId;
import com.newen.workflowEngine.domain.model.workflow.State;
import com.newen.workflowEngine.domain.model.workflow.Transition;
import com.newen.workflowEngine.domain.model.workflow.Workflow;
import com.newen.workflowEngine.domain.model.workflow.WorkflowId;
import com.newen.workflowEngine.infrastructure.repository.memory.InMemoryExecutionRepository;
import com.newen.workflowEngine.infrastructure.repository.memory.InMemoryWorkflowRepository;

public class CanTransitionUseCaseTest {

    @Test
    void should_return_true_when_transition_is_allowed() {
    
        State created = new State("CREATED", false);
        State review = new State("REVIEW", false);
    
        Workflow workflow = new Workflow(
                new WorkflowId(UUID.randomUUID()),
                "Workflow",
                List.of(created, review),
                List.of(
                        new Transition(created, review)
                ),
                created
        );
    
        WorkflowExecution execution = new WorkflowExecution(
                new WorkflowExecutionId(UUID.randomUUID()),
                workflow.getId(),
                created
        );
    
        InMemoryWorkflowRepository workflowRepo =
                new InMemoryWorkflowRepository();
    
        workflowRepo.save(workflow);
    
        InMemoryExecutionRepository executionRepo =
                new InMemoryExecutionRepository();
    
        executionRepo.save(execution);
    
        CanTransitionUseCase useCase =
                new CanTransitionUseCase(
                        workflowRepo,
                        executionRepo
                );
            
        boolean result =
                useCase.execute(
                        execution.getId(),
                        review
                );
            
        assertTrue(result);
    }
    
    @Test
    void should_return_false_when_transition_is_not_allowed() {
    
        State created = new State("CREATED", false);
        State review = new State("REVIEW", false);
        State approved = new State("APPROVED", true);
    
        Workflow workflow = new Workflow(
                new WorkflowId(UUID.randomUUID()),
                "Workflow",
                List.of(created, review, approved),
                List.of(
                        new Transition(created, review)
                ),
                created
        );
    
        WorkflowExecution execution = new WorkflowExecution(
                new WorkflowExecutionId(UUID.randomUUID()),
                workflow.getId(),
                created
        );
    
        InMemoryWorkflowRepository workflowRepo =
                new InMemoryWorkflowRepository();
    
        workflowRepo.save(workflow);
    
        InMemoryExecutionRepository executionRepo =
                new InMemoryExecutionRepository();
    
        executionRepo.save(execution);
    
        CanTransitionUseCase useCase =
                new CanTransitionUseCase(
                        workflowRepo,
                        executionRepo
                );
            
        boolean result =
                useCase.execute(
                        execution.getId(),
                        approved
                );
            
        assertFalse(result);
    }
}
