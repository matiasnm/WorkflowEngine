# Feature: Parallel States

Allow an execution to be in multiple states simultaneously, with the workflow only advancing when all parallel branches reach a join point.

## Status

- **Iteration:** v2 (possibly v3)
- **Deferred because:** Requires a fundamental change to the execution model. `WorkflowExecution.currentState` is a single `State` — parallel execution requires `Set<State>`. This is the most breaking change in the backlog.

---

## Motivation

Some workflows have independent parallel tracks that must all complete before proceeding. Example: an onboarding flow that requires both `BACKGROUND_CHECK` and `CONTRACT_SIGNED` to complete before moving to `ACTIVE`. Today this would require two separate workflow executions and external coordination.

---

## Key Design Questions

- **Model change:** `currentState: State` → `currentStates: Set<State>`. Every piece of code that reads `getCurrentState()` must be updated.
- **Transition semantics:** A transition from a parallel state fires one branch. A join transition requires all branches to have reached their join point before it can execute.
- **Definition format:** How are parallel regions declared in the workflow definition? Fork/join states? Parallel region containers?
- **History:** `StateChanged` records one transition at a time — parallel entry would need to record multiple simultaneous changes.
- **DB schema:** `workflow_execution.current_state_code` (single code) must become a set — new `workflow_execution_state` join table.

---

## Dependencies

- Conflicts with `workflow-versioning.md` — both touch the core execution model; plan together
- `state-timeouts-slas.md` — timeouts become ambiguous in parallel regions
