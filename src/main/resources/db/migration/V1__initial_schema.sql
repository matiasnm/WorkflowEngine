-- V1__initial_schema.sql
-- Initial schema for the workflow engine.
-- Follows the stable-code pattern: execution entities reference state.code
-- instead of state.id for resilience against state identity changes.
--
-- Circular FK dependency between workflow and state is resolved by
-- creating both tables first, then adding both foreign keys via ALTER TABLE.
--
-- See docs/schema.sql and docs/database.dbml for the canonical model.

-- ── WORKFLOW ────────────────────────────────────────────
CREATE TABLE workflow (
    id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    initial_state_id UUID,
    PRIMARY KEY (id)
);

-- ── STATE ───────────────────────────────────────────────
CREATE TABLE state (
    id UUID NOT NULL,
    workflow_id UUID,
    code VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    terminal BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (id)
);

-- ── TRANSITION ──────────────────────────────────────────
CREATE TABLE transition (
    id UUID NOT NULL,
    workflow_id UUID,
    from_state_id UUID,
    to_state_id UUID,
    PRIMARY KEY (id)
);

-- ── WORKFLOW EXECUTION ──────────────────────────────────
CREATE TABLE workflow_execution (
    id UUID NOT NULL,
    workflow_id UUID NOT NULL,
    current_state_code VARCHAR(255) NOT NULL,
    PRIMARY KEY (id)
);

-- ── STATE CHANGED (event log) ──────────────────────────
CREATE TABLE state_changed (
    id UUID NOT NULL,
    execution_id UUID NOT NULL,
    from_state_code VARCHAR(255) NOT NULL,
    to_state_code VARCHAR(255) NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    PRIMARY KEY (id)
);

-- ── WORKFLOW-LEVEL FOREIGN KEYS ─────────────────────────
-- (reference state.id for transitions and initial state)

ALTER TABLE workflow
    ADD CONSTRAINT fk_workflow_initial_state
    FOREIGN KEY (initial_state_id) REFERENCES state(id);

ALTER TABLE state
    ADD CONSTRAINT fk_state_workflow
    FOREIGN KEY (workflow_id) REFERENCES workflow(id);

ALTER TABLE transition
    ADD CONSTRAINT fk_transition_workflow
    FOREIGN KEY (workflow_id) REFERENCES workflow(id);

ALTER TABLE transition
    ADD CONSTRAINT fk_transition_from_state
    FOREIGN KEY (from_state_id) REFERENCES state(id);

ALTER TABLE transition
    ADD CONSTRAINT fk_transition_to_state
    FOREIGN KEY (to_state_id) REFERENCES state(id);

-- ── EXECUTION-LEVEL FOREIGN KEYS (stable-code pattern) ──
-- (reference state.code instead of state.id)

ALTER TABLE workflow_execution
    ADD CONSTRAINT fk_execution_workflow
    FOREIGN KEY (workflow_id) REFERENCES workflow(id);

ALTER TABLE workflow_execution
    ADD CONSTRAINT fk_execution_current_state
    FOREIGN KEY (current_state_code) REFERENCES state(code);

ALTER TABLE state_changed
    ADD CONSTRAINT fk_state_changed_execution
    FOREIGN KEY (execution_id) REFERENCES workflow_execution(id);

ALTER TABLE state_changed
    ADD CONSTRAINT fk_state_changed_from_state
    FOREIGN KEY (from_state_code) REFERENCES state(code);

ALTER TABLE state_changed
    ADD CONSTRAINT fk_state_changed_to_state
    FOREIGN KEY (to_state_code) REFERENCES state(code);
