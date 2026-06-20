# Slice 3 — Migrate remaining components to `asyncData`

**Type:** AFK
**Blocked by:** Slice 2 (pilot validated)

## Parent

Derived from opportunity \#1 in `docs/features/frontend-architecture-deepening.md` — "Primitiva reutilizable de carga asíncrona de datos".

## What to build

Apply the same `asyncData()` migration pattern from Slice 2 to the remaining 4 components:

| Component | API call | Error message |
|---|---|---|
| `WorkflowDetailComponent` | `getWorkflow()` | `'Failed to load workflow.'` |
| `ExecutionDetailComponent` | `getExecution()` + `getNextStates()` | `'Failed to load execution.'` |
| `ExecutionListComponent` | `listExecutions()` | `'Failed to load executions.'` |
| `ExecutionHistoryComponent` | `getHistory()` | `'Failed to load history.'` |

**Note on `ExecutionDetailComponent`:** This component currently uses `forkJoin` for two parallel calls. This slice does NOT restructure that — it only replaces the top-level loading/error/data signal lifecycle. The `forkJoin` consolidation is deferred to Slice 6.

**Note on `WorkflowDetailComponent`:** The `startingExecution` / `executionError` signals are NOT part of this migration — they belong to the "Start Execution" concern which is extracted in Slice 7.

## Acceptance criteria

- [ ] `WorkflowDetailComponent` uses `asyncData()` for the primary workflow data stream
- [ ] `ExecutionDetailComponent` uses `asyncData()` — the returned signals wrap the current loading/error/data (internal forkJoin stays for now)
- [ ] `ExecutionListComponent` uses `asyncData()` for the executions list
- [ ] `ExecutionHistoryComponent` uses `asyncData()` for the history stream
- [ ] All component templates updated to `.loading()`, `.error()`, `.data()` pattern
- [ ] Retry buttons call `.refresh()` instead of legacy methods (where applicable)
- [ ] All component tests updated and passing
- [ ] Manual smoke test: all views load correctly, skeletons show, errors display with retry
