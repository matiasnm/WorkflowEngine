package com.newen.workflowEngine.application.usecase.commands;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.newen.workflowEngine.application.port.WorkflowExecutionRepository;
import com.newen.workflowEngine.application.port.WorkflowRepository;
import com.newen.workflowEngine.domain.exception.WorkflowEditException;
import com.newen.workflowEngine.domain.exception.WorkflowNotFoundException;
import com.newen.workflowEngine.domain.model.workflow.State;
import com.newen.workflowEngine.domain.model.workflow.Transition;
import com.newen.workflowEngine.domain.model.workflow.Workflow;
import com.newen.workflowEngine.domain.model.workflow.WorkflowId;

@Service
public class UpdateWorkflowUseCase {

    private final WorkflowRepository workflowRepository;
    private final WorkflowExecutionRepository executionRepository;

    public UpdateWorkflowUseCase(
            WorkflowRepository workflowRepository,
            WorkflowExecutionRepository executionRepository
    ) {
        this.workflowRepository = workflowRepository;
        this.executionRepository = executionRepository;
    }

    @Transactional
    public Workflow execute(WorkflowId workflowId, String name,
                            List<State> states, List<Transition> transitions,
                            State initialState) {

        // 0. Load existing workflow
        Workflow existing = workflowRepository.findById(workflowId)
            .orElseThrow(() -> new WorkflowNotFoundException("Workflow not found"));

        // 1. Auto-clear terminal flag for states that now have outgoing transitions
        List<State> adjustedStates = autoClearTerminal(states, transitions);

        // 2. Re-bind transitions and initialState to adjusted State instances
        Map<String, State> stateByCode = adjustedStates.stream()
                .collect(Collectors.toMap(State::code, s -> s));

        List<Transition> adjustedTransitions = transitions.stream()
                .map(t -> new Transition(
                        stateByCode.get(t.getFrom().code()),
                        stateByCode.get(t.getTo().code())))
                .toList();

        State adjustedInitial = stateByCode.get(initialState.code());

        // 3. Build new workflow (runs domain validation — e.g. rejects terminal states
        //    with outgoing transitions, which autoClearTerminal already prevented)
        Workflow updated = new Workflow(
                workflowId, name, adjustedStates, adjustedTransitions, adjustedInitial);

        // 4. Validate edit constraints against existing executions
        validateEditConstraints(existing, updated);

        // 5. Persist
        workflowRepository.update(updated);
        return updated;
    }

    // ─────────────────────────────────────────────────────────────────
    // Private helpers
    // ─────────────────────────────────────────────────────────────────

    /**
     * Any state that has at least one outgoing transition is forcefully set to
     * non-terminal. This prevents the user from accidentally (or intentionally)
     * keeping the terminal flag on a state that has outgoing transitions, which
     * the domain model forbids.
     */
    private List<State> autoClearTerminal(List<State> states, List<Transition> transitions) {
        // Build set of from-codes that appear in transitions
        Set<String> fromCodes = transitions.stream()
                .map(t -> t.getFrom().code())
                .collect(Collectors.toSet());

        return states.stream()
                .map(s -> fromCodes.contains(s.code()) && s.terminal()
                        ? new State(s.code(), s.name(), false)
                        : s)
                .toList();
    }

    private void validateEditConstraints(Workflow existing, Workflow updated) {
        List<String> violations = new ArrayList<>();

        Set<String> oldCodes = existing.getStates().stream()
                .map(State::code)
                .collect(Collectors.toSet());
        Set<String> newCodes = updated.getStates().stream()
                .map(State::code)
                .collect(Collectors.toSet());

        // ── Removed states ──────────────────────────────────────────
        for (String code : oldCodes) {
            if (!newCodes.contains(code)) {
                long active   = executionRepository.countByCurrentStateCode(code);
                long history  = executionRepository.countByStateCodeInHistory(code);
                long total    = active + history;
                if (total > 0) {
                    violations.add(
                            "State '" + code + "' is referenced by " + total
                            + " execution(s) and cannot be removed");
                }
            }
        }

        // ── Removed / changed transitions ──────────────────────────
        Set<String> newTransitionKeys = updated.getTransitions().stream()
                .map(t -> t.getFrom().code() + "->" + t.getTo().code())
                .collect(Collectors.toSet());

        for (Transition oldT : existing.getTransitions()) {
            String key = oldT.getFrom().code() + "->" + oldT.getTo().code();
            if (!newTransitionKeys.contains(key)) {
                long execs = executionRepository.countByCurrentStateCode(
                        oldT.getFrom().code());
                if (execs > 0) {
                    violations.add(
                            "Cannot remove transition from '"
                            + oldT.getFrom().code() + "' to '"
                            + oldT.getTo().code() + "' — " + execs
                            + " execution(s) are in the source state");
                }
            }
        }

        // ── Terminal → non-terminal changes ─────────────────────────
        for (State oldState : existing.getStates()) {
            if (oldState.terminal()) {
                State newState = updated.getStates().stream()
                        .filter(s -> s.code().equals(oldState.code()))
                        .findFirst()
                        .orElse(null);
                // null means the state was removed — already handled above
                if (newState != null && !newState.terminal()) {
                    long execs = executionRepository.countByCurrentStateCode(
                            oldState.code());
                    if (execs > 0) {
                        violations.add(
                                "State '" + oldState.code()
                                + "' is terminal with " + execs
                                + " active execution(s) and cannot be changed to non-terminal");
                    }
                }
            }
        }

        if (!violations.isEmpty()) {
            throw new WorkflowEditException(
                    "Cannot update workflow: " + violations.size()
                    + " constraint(s) violated",
                    violations);
        }
    }
}
