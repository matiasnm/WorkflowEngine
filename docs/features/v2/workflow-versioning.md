# Feature: Workflow Versioning

Allow workflow definitions to evolve over time without breaking executions that are mid-flight on an older version of the definition.

## Status

- **Iteration:** v2
- **Deferred because:** This is the most architecturally complex feature in the backlog. It touches the core data model and cannot be added incrementally. It should be designed holistically once the rest of v1 is stable.

---

## Motivation

Today a workflow definition is mutable (with the modify guard from `workflow-execution-crud.md`). The guard blocks modifications while non-terminal executions exist, which is safe but limiting — you can't improve a workflow while it's in active use.

Versioning solves this by letting old executions run to completion against v1 of the definition, while new executions start against v2.

---

## Key Design Questions

- **Version model:** Does a workflow have a `version` number that increments on each edit? Or does each edit create a new `WorkflowDefinition` entity while the `Workflow` is just an identifier + pointer to the active version?
- **Execution binding:** An execution is bound to the version of the workflow that was active when it started. This means `workflow_execution` must reference a specific version, not just the workflow ID.
- **DB schema impact:** `state`, `transition`, and `initial_state` must move from `workflow` to `workflow_version`. The `state_changed` and `workflow_execution` FK references to `state.code` become ambiguous across versions (two versions could have a state with the same code but different semantics).
- **State code uniqueness:** Currently `state.code` is globally unique (`UNIQUE` constraint in `V1__initial_schema.sql`). With versioning, the same code could exist in multiple versions of the same workflow. The unique constraint must be scoped to `(workflow_id, version, code)`.
- **API impact:** `GET /workflows/{id}` returns the active version. `GET /workflows/{id}/versions/{v}` returns a specific version. `GET /executions/{id}` must show which version the execution is running on.

---

## Rough Implementation Sketch

1. New `workflow_version` table: `(id, workflow_id, version_number, created_at)` — contains states and transitions
2. Move `state` and `transition` to reference `workflow_version_id` instead of `workflow_id`
3. `workflow_execution` references `workflow_version_id`
4. `PUT /workflows/{id}` creates a new version instead of replacing in-place
5. `WorkflowRepository` returns the latest published version by default
6. `WorkflowTransitionFacade` loads the version bound to the execution, not the latest

---

## Dependencies

- `workflow-execution-crud.md` — the modify workflow feature is a simpler precursor; versioning supersedes the modify guard
