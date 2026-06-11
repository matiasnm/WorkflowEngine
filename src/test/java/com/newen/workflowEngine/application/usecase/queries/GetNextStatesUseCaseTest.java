package com.newen.workflowEngine.application.usecase.queries;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import org.junit.jupiter.api.Test;

import com.newen.workflowEngine.domain.model.execution.WorkflowExecution;
import com.newen.workflowEngine.domain.model.execution.WorkflowExecutionId;
import com.newen.workflowEngine.domain.model.workflow.State;
import com.newen.workflowEngine.domain.model.workflow.Transition;
import com.newen.workflowEngine.domain.model.workflow.Workflow;
import com.newen.workflowEngine.domain.model.workflow.WorkflowId;
import com.newen.workflowEngine.infrastructure.persistence.repository.memory.InMemoryWorkflowExecutionRepository;
import com.newen.workflowEngine.infrastructure.persistence.repository.memory.InMemoryWorkflowRepository;

public class GetNextStatesUseCaseTest {

    @Test
    void should_return_next_states_of_execution() {
    
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
    
        workflowRepo.save(workflow);
    
        InMemoryWorkflowExecutionRepository executionRepo =
                new InMemoryWorkflowExecutionRepository();
    
        executionRepo.save(execution);
    
        GetNextStatesUseCase useCase =
                new GetNextStatesUseCase(
                        workflowRepo,
                        executionRepo
                );
            
        List<State> next =
                useCase.execute(execution.getId());
            
        assertEquals(1, next.size());
        assertEquals(review, next.getFirst());
    }
}