CREATE TABLE "workflow" (
  "id" uuid PRIMARY KEY,
  "name" varchar,
  "initial_state_id" uuid
);

CREATE TABLE "state" (
  "id" uuid PRIMARY KEY,
  "workflow_id" uuid,
  "code" varchar UNIQUE NOT NULL,
  "name" varchar,
  "terminal" boolean
);

CREATE TABLE "transition" (
  "id" uuid PRIMARY KEY,
  "workflow_id" uuid,
  "from_state_id" uuid,
  "to_state_id" uuid
);

CREATE TABLE "workflow_execution" (
  "id" uuid PRIMARY KEY,
  "workflow_id" uuid,
  "current_state_code" varchar
);

CREATE TABLE "state_changed" (
  "id" uuid PRIMARY KEY,
  "execution_id" uuid,
  "from_state_code" varchar,
  "to_state_code" varchar,
  "timestamp" timestamp
);

-- Workflow-level FKs (still reference state.id for transitions and initial state)
ALTER TABLE "workflow" ADD FOREIGN KEY ("initial_state_id") REFERENCES "state" ("id");

ALTER TABLE "state" ADD FOREIGN KEY ("workflow_id") REFERENCES "workflow" ("id");

ALTER TABLE "transition" ADD FOREIGN KEY ("workflow_id") REFERENCES "workflow" ("id");
ALTER TABLE "transition" ADD FOREIGN KEY ("from_state_id") REFERENCES "state" ("id");
ALTER TABLE "transition" ADD FOREIGN KEY ("to_state_id") REFERENCES "state" ("id");

-- Execution-level FKs (reference state.code instead of state.id — stable-code pattern)
ALTER TABLE "workflow_execution" ADD FOREIGN KEY ("workflow_id") REFERENCES "workflow" ("id");
ALTER TABLE "workflow_execution" ADD FOREIGN KEY ("current_state_code") REFERENCES "state" ("code");

ALTER TABLE "state_changed" ADD FOREIGN KEY ("execution_id") REFERENCES "workflow_execution" ("id");
ALTER TABLE "state_changed" ADD FOREIGN KEY ("from_state_code") REFERENCES "state" ("code");
ALTER TABLE "state_changed" ADD FOREIGN KEY ("to_state_code") REFERENCES "state" ("code");
