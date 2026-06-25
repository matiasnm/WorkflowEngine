package com.newen.workflowEngine.application.port;

import java.util.List;
import java.util.Optional;
import java.util.Set;

import com.newen.workflowEngine.domain.model.execution.WorkflowExecution;
import com.newen.workflowEngine.domain.model.execution.WorkflowExecutionId;
import com.newen.workflowEngine.domain.model.workflow.WorkflowId;

public interface WorkflowExecutionRepository {

    Optional<WorkflowExecution> findById(WorkflowExecutionId id);

    List<WorkflowExecution> findByWorkflowId(WorkflowId workflowId);

    List<WorkflowExecution> findByWorkflowId(WorkflowId workflowId, int page, int size);

    int countByWorkflowId(WorkflowId workflowId);

    void save(WorkflowExecution instance);

    boolean existsByWorkflowId(WorkflowId workflowId);

    void deleteById(WorkflowExecutionId id);

    boolean existsNonTerminalByWorkflowId(WorkflowId workflowId, Set<String> terminalStateCodes);

    long countByCurrentStateCode(String stateCode);

    long countByStateCodeInHistory(String stateCode);
}