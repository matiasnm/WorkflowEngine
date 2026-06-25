-- V3__cascade_deletes.sql
-- Add ON DELETE CASCADE to FK constraints for safe workflow/execution deletion.
--
-- Workflow → State/Transition: deleting a workflow cascades to its states and transitions.
-- Execution → StateChanged: deleting a terminal execution cascades to its history.
--
-- The use case layer guards against deleting workflows with existing executions
-- and deleting non-terminal executions — the cascade is a safety net for the
-- happy path, not a bypass for the guard.

ALTER TABLE state
    DROP CONSTRAINT fk_state_workflow,
    ADD CONSTRAINT fk_state_workflow
        FOREIGN KEY (workflow_id) REFERENCES workflow(id) ON DELETE CASCADE;

ALTER TABLE transition
    DROP CONSTRAINT fk_transition_workflow,
    ADD CONSTRAINT fk_transition_workflow
        FOREIGN KEY (workflow_id) REFERENCES workflow(id) ON DELETE CASCADE;

ALTER TABLE state_changed
    DROP CONSTRAINT fk_state_changed_execution,
    ADD CONSTRAINT fk_state_changed_execution
        FOREIGN KEY (execution_id) REFERENCES workflow_execution(id) ON DELETE CASCADE;
