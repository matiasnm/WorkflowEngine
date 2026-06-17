package com.newen.workflowEngine.application.usecase.commands;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import org.junit.jupiter.api.Test;

import com.newen.workflowEngine.application.facade.WorkflowTransitionFacade;
import com.newen.workflowEngine.application.usecase.commands.dto.ExecuteTransitionResult;
import com.newen.workflowEngine.domain.model.execution.WorkflowExecution;
import com.newen.workflowEngine.domain.model.execution.WorkflowExecutionId;
import com.newen.workflowEngine.domain.model.workflow.State;
import com.newen.workflowEngine.domain.model.workflow.Transition;
import com.newen.workflowEngine.domain.model.workflow.Workflow;
import com.newen.workflowEngine.domain.model.workflow.WorkflowId;
import com.newen.workflowEngine.domain.service.WorkflowEngine;
import com.newen.workflowEngine.infrastructure.persistence.repository.memory.InMemoryWorkflowExecutionRepository;
import com.newen.workflowEngine.infrastructure.persistence.repository.memory.InMemoryWorkflowRepository;


public class ExecuteTransitionUseCaseTest {
    
    @Test
    void should_execute_valid_transition_and_return_result() {

        State created = new State("CREATED", false);
        State review = new State("REVIEW", false);

        Workflow workflow = new Workflow(
                new WorkflowId(UUID.randomUUID()),
                "Workflow",
                List.of(created, review),
                List.of(new Transition(created, review)),
                created
        );

        WorkflowExecution execution = new WorkflowExecution(
                new WorkflowExecutionId(UUID.randomUUID()),
                workflow.getId(),
                created
        );

        InMemoryWorkflowRepository workflowRepo =
        new InMemoryWorkflowRepository();

        InMemoryWorkflowExecutionRepository executionRepo =
        new InMemoryWorkflowExecutionRepository();

        workflowRepo.save(workflow);
        executionRepo.save(execution);

        WorkflowEngine engine = new WorkflowEngine();

        WorkflowTransitionFacade facade = new WorkflowTransitionFacade(
                workflowRepo, 
                executionRepo, 
                engine
        );
        
        ExecuteTransitionUseCase useCase = new ExecuteTransitionUseCase(facade);

        ExecuteTransitionResult result =
                useCase.execute(execution.getId(), review);

        WorkflowExecution updated =
                executionRepo.findById(execution.getId())
                        .orElseThrow();

        assertEquals(review, updated.getCurrentState());

        assertEquals(execution.getId(), result.executionId());
        assertEquals(created, result.previousState());
        assertEquals(review, result.currentState());

        assertEquals(1, updated.getHistory().size());
    }
    
}