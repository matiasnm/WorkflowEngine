package com.newen.workflowEngine.application.usecase.queries;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import org.junit.jupiter.api.Test;

import com.newen.workflowEngine.application.facade.WorkflowTransitionFacade;
import com.newen.workflowEngine.domain.model.execution.WorkflowExecution;
import com.newen.workflowEngine.domain.model.execution.WorkflowExecutionId;
import com.newen.workflowEngine.domain.model.workflow.State;
import com.newen.workflowEngine.domain.model.workflow.Transition;
import com.newen.workflowEngine.domain.model.workflow.Workflow;
import com.newen.workflowEngine.domain.model.workflow.WorkflowId;
import com.newen.workflowEngine.domain.service.WorkflowEngine;
import com.newen.workflowEngine.infrastructure.persistence.repository.memory.InMemoryWorkflowExecutionRepository;
import com.newen.workflowEngine.infrastructure.persistence.repository.memory.InMemoryWorkflowRepository;

public class GetNextStatesUseCaseTest {

    @Test
    void should_return_next_states_of_execution() {
    
        State created = new State("created", "CREATED", false);
        State review = new State("review", "REVIEW", false);
    
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
    
        workflowRepo.save(workflow);
    
        InMemoryWorkflowExecutionRepository executionRepo =
                new InMemoryWorkflowExecutionRepository();
    
        executionRepo.save(execution);
    
        WorkflowTransitionFacade facade = new WorkflowTransitionFacade(
                workflowRepo,
                executionRepo,
                new WorkflowEngine()
        );
        
        GetNextStatesUseCase useCase = new GetNextStatesUseCase(facade);
            
        List<State> next =
                useCase.execute(execution.getId());
            
        assertEquals(1, next.size());
        assertEquals(review, next.getFirst());
    }
}