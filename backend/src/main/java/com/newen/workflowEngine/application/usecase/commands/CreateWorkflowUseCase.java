package com.newen.workflowEngine.application.usecase.commands;

import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.newen.workflowEngine.application.port.WorkflowRepository;
import com.newen.workflowEngine.domain.model.workflow.State;
import com.newen.workflowEngine.domain.model.workflow.Transition;
import com.newen.workflowEngine.domain.model.workflow.Workflow;
import com.newen.workflowEngine.domain.model.workflow.WorkflowId;

@Service
public class CreateWorkflowUseCase {

    private final WorkflowRepository workflowRepository;

    public CreateWorkflowUseCase(
            WorkflowRepository workflowRepository
    ) {
        this.workflowRepository = workflowRepository;
    }

    @Transactional
    public Workflow execute(
            String name,
            List<State> states,
            List<Transition> transitions,
            State initialState
    ) {

        Workflow workflow = new Workflow(
                new WorkflowId(UUID.randomUUID()),
                name,
                states,
                transitions,
                initialState
        );

        workflowRepository.save(workflow);

        return workflow;
    }
}