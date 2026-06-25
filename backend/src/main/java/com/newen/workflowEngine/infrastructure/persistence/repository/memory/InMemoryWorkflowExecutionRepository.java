package com.newen.workflowEngine.infrastructure.persistence.repository.memory;

import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Repository;

import com.newen.workflowEngine.application.port.WorkflowExecutionRepository;
import com.newen.workflowEngine.domain.model.execution.WorkflowExecution;
import com.newen.workflowEngine.domain.model.execution.WorkflowExecutionId;
import com.newen.workflowEngine.domain.model.workflow.WorkflowId;

@Profile("memory")
@Repository
public class InMemoryWorkflowExecutionRepository
        implements WorkflowExecutionRepository {

    private final Map<WorkflowExecutionId, WorkflowExecution> storage =
            new HashMap<>();

    @Override
    public Optional<WorkflowExecution> findById(
            WorkflowExecutionId id
    ) {
        return Optional.ofNullable(storage.get(id));
    }

    @Override
    public List<WorkflowExecution> findByWorkflowId(WorkflowId workflowId) {
        return storage.values().stream()
                .filter(execution -> execution.getWorkflowId().equals(workflowId))
                .toList();
    }

    @Override
    public List<WorkflowExecution> findByWorkflowId(WorkflowId workflowId, int page, int size) {
        return storage.values().stream()
                .filter(execution -> execution.getWorkflowId().equals(workflowId))
                .sorted(Comparator.comparing(e -> e.getId().value()))
                .skip((long) page * size)
                .limit(size)
                .toList();
    }

    @Override
    public int countByWorkflowId(WorkflowId workflowId) {
        return (int) storage.values().stream()
                .filter(execution -> execution.getWorkflowId().equals(workflowId))
                .count();
    }

    @Override
    public void save(
            WorkflowExecution execution
    ) {
        storage.put(execution.getId(), execution);
    }

    @Override
    public boolean existsByWorkflowId(WorkflowId workflowId) {
        return !storage.values().stream()
                .filter(execution -> execution.getWorkflowId().equals(workflowId))
                .toList().isEmpty();
    }

    @Override
    public void deleteById(WorkflowExecutionId id) {
        storage.remove(id);
    }

    @Override
    public boolean existsNonTerminalByWorkflowId(WorkflowId workflowId, Set<String> terminalStateCodes) {
        return storage.values().stream()
                .filter(execution -> execution.getWorkflowId().equals(workflowId))
                .anyMatch(execution -> !terminalStateCodes.contains(execution.getCurrentState().code()));
    }

    @Override
    public long countByCurrentStateCode(String stateCode) {
        return storage.values().stream()
                .filter(execution -> execution.getCurrentState().code().equals(stateCode))
                .count();
    }

    @Override
    public long countByStateCodeInHistory(String stateCode) {
        return storage.values().stream()
                .filter(execution ->
                    execution.getHistory().stream()
                        .anyMatch(event ->
                            event.getFrom().code().equals(stateCode)
                            || event.getTo().code().equals(stateCode)))
                .count();
    }
}