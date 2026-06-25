package com.newen.workflowEngine.application.usecase.queries;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.newen.workflowEngine.api.dto.WorkflowEditabilityResponse;
import com.newen.workflowEngine.api.dto.WorkflowEditabilityResponse.Restrictions;
import com.newen.workflowEngine.application.port.WorkflowExecutionRepository;
import com.newen.workflowEngine.application.port.WorkflowRepository;
import com.newen.workflowEngine.domain.exception.WorkflowNotFoundException;
import com.newen.workflowEngine.domain.model.workflow.State;
import com.newen.workflowEngine.domain.model.workflow.Workflow;
import com.newen.workflowEngine.domain.model.workflow.WorkflowId;

@Service
public class GetWorkflowEditabilityUseCase {

    private final WorkflowRepository workflowRepository;
    private final WorkflowExecutionRepository executionRepository;

    public GetWorkflowEditabilityUseCase(
            WorkflowRepository workflowRepository,
            WorkflowExecutionRepository executionRepository
    ) {
        this.workflowRepository = workflowRepository;
        this.executionRepository = executionRepository;
    }

    @Transactional(readOnly = true)
    public WorkflowEditabilityResponse execute(UUID workflowUuid) {
        WorkflowId workflowId = new WorkflowId(workflowUuid);

        // Load workflow (throws 404 if not found)
        Workflow workflow = workflowRepository.findById(workflowId)
                .orElseThrow(() -> new WorkflowNotFoundException("Workflow not found: " + workflowUuid));

        int executionCount = executionRepository.countByWorkflowId(workflowId);
        boolean hasExecutions = executionCount > 0;

        // Determine which states are locked (referenced by executions)
        List<String> lockedStates = new ArrayList<>();
        List<String> renameableStates = new ArrayList<>();

        for (State state : workflow.getStates()) {
            long refs = executionRepository.countByCurrentStateCode(state.code())
                       + executionRepository.countByStateCodeInHistory(state.code());
            if (refs > 0) {
                lockedStates.add(state.code());
            } else {
                renameableStates.add(state.code());
            }
        }

        String lockedReason = hasExecutions
                ? "Referenced by " + executionCount + " execution(s)"
                : null;

        Restrictions restrictions = new Restrictions(
                renameableStates,
                lockedStates,
                lockedReason,
                !hasExecutions,         // canChangeTerminal
                !hasExecutions,         // canRemoveStates
                true,                   // canRenameWorkflow (always allowed)
                true,                   // canAddStates (always allowed)
                true,                   // canChangeInitialState (always allowed)
                true,                   // canAddTransitions (always allowed)
                true                    // canRemoveTransitions (always allowed)
        );

        return new WorkflowEditabilityResponse(
                workflowUuid,
                hasExecutions,
                executionCount,
                restrictions
        );
    }
}
