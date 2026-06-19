-- V2__add_performance_indexes.sql
-- Add indexes for common query patterns not covered by PKs and UNIQUE constraints.
--
-- Current query patterns:
--   state.workflow_id        — @OneToMany(mappedBy = "workflow") in WorkflowEntity
--   transition.workflow_id   — @OneToMany(mappedBy = "workflow") in WorkflowEntity
--   workflow_execution.workflow_id  — FK lookup (workflow → executions)
--   state_changed.execution_id      — @OneToMany(mappedBy = "execution") in WorkflowExecutionEntity
--   state_changed.from_state_code   — stable-code lookup
--   state_changed.to_state_code     — stable-code lookup

CREATE INDEX idx_state_workflow_id
    ON state (workflow_id);

CREATE INDEX idx_transition_workflow_id
    ON transition (workflow_id);

CREATE INDEX idx_workflow_execution_workflow_id
    ON workflow_execution (workflow_id);

CREATE INDEX idx_state_changed_execution_id
    ON state_changed (execution_id);

CREATE INDEX idx_state_changed_from_state_code
    ON state_changed (from_state_code);

CREATE INDEX idx_state_changed_to_state_code
    ON state_changed (to_state_code);
