package com.newen.workflowEngine.application.usecase.queries;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import org.junit.jupiter.api.Test;

import com.newen.workflowEngine.domain.event.StateChanged;
import com.newen.workflowEngine.domain.model.execution.WorkflowExecution;
import com.newen.workflowEngine.domain.model.execution.WorkflowExecutionId;
import com.newen.workflowEngine.domain.model.workflow.State;
import com.newen.workflowEngine.domain.model.workflow.WorkflowId;
import com.newen.workflowEngine.infrastructure.repository.memory.InMemoryExecutionRepository;

public class GetHistoryUseCaseTest {

    @Test
    void should_return_execution_history() {
    
        State created = new State("CREATED", false);
        State review = new State("REVIEW", false);
    
        WorkflowExecution execution = new WorkflowExecution(
                new WorkflowExecutionId(UUID.randomUUID()),
                new WorkflowId(UUID.randomUUID()),
                created
        );
    
        StateChanged event = new StateChanged(
                execution.getId(),
                created,
                review,
                java.time.Instant.now()
        );
    
        execution.addEvent(event);
    
        InMemoryExecutionRepository executionRepo = new InMemoryExecutionRepository();
        executionRepo.save(execution);
    
        GetHistoryUseCase useCase =
                new GetHistoryUseCase(executionRepo);
    
        List<StateChanged> history =
                useCase.execute(execution.getId());
    
        assertEquals(1, history.size());
        assertEquals(created, history.get(0).getFrom());
        assertEquals(review, history.get(0).getTo());
    }

}