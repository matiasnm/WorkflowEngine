package com.newen.workflowEngine.infrastructure.persistence.mapper;

import org.springframework.stereotype.Component;

import com.newen.workflowEngine.domain.event.StateChanged;
import com.newen.workflowEngine.domain.exception.StateNotFoundInWorkflowException;
import com.newen.workflowEngine.domain.model.execution.WorkflowExecution;
import com.newen.workflowEngine.domain.model.execution.WorkflowExecutionId;
import com.newen.workflowEngine.domain.model.workflow.State;
import com.newen.workflowEngine.domain.model.workflow.Workflow;
import com.newen.workflowEngine.infrastructure.persistence.entity.StateEntity;
import com.newen.workflowEngine.infrastructure.persistence.entity.WorkflowEntity;
import com.newen.workflowEngine.infrastructure.persistence.entity.WorkflowExecutionEntity;


@Component
public class ExecutionMapper {


    private State resolveState(Workflow workflow, String name) {
        return workflow.getStates()
            .stream()
            .filter(s -> s.name().equals(name))
            .findFirst()
            .orElseThrow(() -> new StateNotFoundInWorkflowException("State not found in workflow: " + name));
    }
        

    public WorkflowExecutionEntity toEntity(
            WorkflowExecution execution,
            WorkflowEntity workflowEntity,
            StateEntity currentState
    ) {

        WorkflowExecutionEntity entity = new WorkflowExecutionEntity();

        entity.setId(execution.getId().value());
        entity.setWorkflow(workflowEntity);
        entity.setCurrentState(currentState);

        return entity;
    }


    public WorkflowExecution toDomain(
            WorkflowExecutionEntity entity,
            Workflow workflow
    ) {

        State current = resolveState(
            workflow,
            entity.getCurrentState().getName()
        );

        WorkflowExecution execution = new WorkflowExecution(
                new WorkflowExecutionId(entity.getId()),
                workflow.getId(),
                current
        );

        System.out.println(
            "history size entity = "
            + entity.getHistory().size()
        );
        entity.getHistory().forEach(h -> {

                State from = resolveState(workflow, h.getFrom().getName());
                State to = resolveState(workflow, h.getTo().getName());
                execution.addEvent(new StateChanged(
                        execution.getId(),
                        from, to, h.getTimestamp())
                );
        });

        return execution;
    }
}