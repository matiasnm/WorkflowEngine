# Feature: Workflow & Execution CRUD (Delete + Modify)

Add delete and modify operations for workflow definitions and executions, with guards that prevent structural changes while executions are mid-flight.

## Status

- **Iteration:** v0.6
- **Backend:** ❌ Not implemented
- **Frontend:** ❌ Not implemented
- **Dependencies:** None

---

## Table of Contents

1. [Motivation](#1-motivation)
2. [Scope](#2-scope)
3. [Guard Policy](#3-guard-policy)
4. [Architecture](#4-architecture)
5. [Slice A — Delete Workflow](#5-slice-a--delete-workflow)
6. [Slice B — Delete Execution](#6-slice-b--delete-execution)
7. [Slice C — Modify Workflow](#7-slice-c--modify-workflow)
8. [DB Migration](#8-db-migration)
9. [Implementation Order](#9-implementation-order)
10. [Tests](#10-tests)
11. [Open Questions / Decisions Log](#11-open-questions--decisions-log)
12. [Changelog](#12-changelog)

---

## 1. Motivation

The API currently only supports create and read. There is no way to:
- Remove a workflow definition that was created by mistake or is no longer needed
- Remove an individual execution from the record
- Update a workflow's name, states, or transitions after creation

Delete and modify are standard CRUD operations that users expect. The challenge with a workflow engine is that executions are live references to a workflow's state graph — blindly deleting or restructuring a workflow while executions are in progress would leave those executions in an inconsistent state. Guards make these operations safe.

---

## 2. Scope

### In Scope

| Layer | Deliverable |
|---|---|
| **Backend** | `DELETE /workflows/{id}` — deletes a workflow if no executions exist |
| **Backend** | `DELETE /executions/{id}` — deletes an execution if it is in a terminal state |
| **Backend** | `PUT /workflows/{id}` — full replacement of a workflow definition if no non-terminal executions exist |
| **Backend** | `WorkflowRepository.deleteById()` and `existsByWorkflowId()` port methods |
| **Backend** | `WorkflowExecutionRepository.deleteById()` and `existsNonTerminalByWorkflowId()` port methods |
| **Backend** | `DeleteWorkflowUseCase`, `DeleteExecutionUseCase`, `UpdateWorkflowUseCase` |
| **Backend** | DB migration to add `CASCADE DELETE` on relevant FK constraints |
| **Backend** | New exceptions: `WorkflowHasExecutionsException` (409), `ExecutionNotTerminalException` (409) |
| **Frontend** | Delete button on workflow detail page (with confirmation dialog) |
| **Frontend** | Delete button on execution detail page (with confirmation dialog, only shown if terminal) |
| **Frontend** | Edit workflow form (same form as create, pre-filled) |

### Out of Scope

- Soft delete (logical deletion with `deleted_at`) — hard delete is fine for v1
- Partial workflow update (PATCH) — PUT full-replace is simpler and avoids partial-state edge cases
- Bulk delete — out of scope

---

## 3. Guard Policy

The guards exist to prevent a workflow's state graph from being changed while executions are actively using it.

| Operation | Guard | HTTP status on violation |
|---|---|---|
| **Delete workflow** | Block if ANY execution (terminal or not) references this workflow | 409 Conflict |
| **Delete execution** | Block if the execution is NOT in a terminal state | 409 Conflict |
| **Modify workflow** | Block if ANY execution is NOT in a terminal state | 409 Conflict |

**Why delete workflow is stricter than modify:**
Deleting a workflow removes the state graph entirely. Even terminal executions hold state codes that reference rows in the `state` table — the FK `workflow_execution.current_state_code → state(code)` and `state_changed.*_state_code → state(code)` would be violated by a cascade. For v1, the simplest safe policy is: a workflow can only be deleted when it has zero executions.

**Why modify only blocks non-terminal executions:**
Terminal executions are frozen — they will never transition again. Their `current_state_code` references a state code that still exists in the replaced definition (because state codes must remain unchanged — see §7). Non-terminal executions would attempt future transitions against the new definition, which may have different valid transitions.

---

## 4. Architecture

No new ports or adapters. This feature adds methods to existing ports and three new use cases.

```
DELETE /workflows/{id}
  → DeleteWorkflowUseCase
      → executionRepository.existsByWorkflowId()   ← guard
      → workflowRepository.deleteById()

DELETE /executions/{id}
  → DeleteExecutionUseCase
      → executionRepository.findById()              ← load to check terminal
      → workflowRepository.findById()               ← load to resolve terminal codes
      → executionRepository.deleteById()

PUT /workflows/{id}
  → UpdateWorkflowUseCase
      → executionRepository.existsNonTerminalByWorkflowId()  ← guard
      → workflowRepository.save()                            ← overwrite (same ID)
```

---

## 5. Slice A — Delete Workflow

### 5.1 Port additions — `WorkflowRepository`

```java
void deleteById(WorkflowId id);
boolean existsByWorkflowId(WorkflowId id); // true if at least one execution references this workflow
```

The second method belongs on `WorkflowExecutionRepository` since it queries executions, not workflows:

```java
// WorkflowExecutionRepository
boolean existsByWorkflowId(WorkflowId workflowId);
```

### 5.2 `DeleteWorkflowUseCase`

```java
@Service
public class DeleteWorkflowUseCase {

    private final WorkflowRepository workflowRepository;
    private final WorkflowExecutionRepository executionRepository;

    @Transactional
    public void execute(WorkflowId workflowId) {
        workflowRepository.findById(workflowId)
            .orElseThrow(() -> new WorkflowNotFoundException("Workflow not found"));

        if (executionRepository.existsByWorkflowId(workflowId)) {
            throw new WorkflowHasExecutionsException(
                "Cannot delete workflow with existing executions");
        }

        workflowRepository.deleteById(workflowId);
    }
}
```

### 5.3 New exception

```java
public class WorkflowHasExecutionsException extends RuntimeException {
    public WorkflowHasExecutionsException(String message) { super(message); }
}
```

Register in `GlobalExceptionHandler` → 409 Conflict.

### 5.4 Controller

```java
@DeleteMapping("/workflows/{workflowId}")
@ResponseStatus(HttpStatus.NO_CONTENT)
@Operation(summary = "Delete a workflow definition")
@ApiResponse(responseCode = "204", description = "Workflow deleted")
@ApiResponse(responseCode = "404", description = "Workflow not found")
@ApiResponse(responseCode = "409", description = "Workflow has existing executions")
public void deleteWorkflow(@PathVariable UUID workflowId) {
    deleteWorkflowUseCase.execute(new WorkflowId(workflowId));
}
```

---

## 6. Slice B — Delete Execution

### 6.1 Port addition — `WorkflowExecutionRepository`

```java
void deleteById(WorkflowExecutionId id);
```

### 6.2 `DeleteExecutionUseCase`

The use case loads the execution and its workflow to determine which states are terminal, then checks the guard.

```java
@Service
public class DeleteExecutionUseCase {

    private final WorkflowExecutionRepository executionRepository;
    private final WorkflowRepository workflowRepository;

    @Transactional
    public void execute(WorkflowExecutionId executionId) {
        WorkflowExecution execution = executionRepository.findById(executionId)
            .orElseThrow(() -> new WorkflowExecutionNotFoundException("Execution not found"));

        Workflow workflow = workflowRepository.findById(execution.getWorkflowId())
            .orElseThrow(() -> new WorkflowNotFoundException("Workflow not found"));

        boolean isTerminal = workflow.getStates().stream()
            .filter(s -> s.code().equals(execution.getCurrentState().code()))
            .findFirst()
            .map(State::terminal)
            .orElse(false);

        if (!isTerminal) {
            throw new ExecutionNotTerminalException(
                "Cannot delete a non-terminal execution");
        }

        executionRepository.deleteById(executionId);
    }
}
```

### 6.3 New exception

```java
public class ExecutionNotTerminalException extends RuntimeException {
    public ExecutionNotTerminalException(String message) { super(message); }
}
```

Register in `GlobalExceptionHandler` → 409 Conflict.

### 6.4 Controller

```java
@DeleteMapping("/executions/{executionId}")
@ResponseStatus(HttpStatus.NO_CONTENT)
@Operation(summary = "Delete a terminal execution")
@ApiResponse(responseCode = "204", description = "Execution deleted")
@ApiResponse(responseCode = "404", description = "Execution not found")
@ApiResponse(responseCode = "409", description = "Execution is not in a terminal state")
public void deleteExecution(@PathVariable UUID executionId) {
    deleteExecutionUseCase.execute(new WorkflowExecutionId(executionId));
}
```

---

## 7. Slice C — Modify Workflow

### 7.1 Constraint: state codes are immutable

State `code` values must not change between the old and new definition. They are stored in `workflow_execution.current_state_code` and `state_changed.*_state_code` as stable foreign key references. Changing a code while those references exist would violate DB constraints.

**What CAN be changed:**
- Workflow `name`
- State `name` (display label — not the code)
- State `terminal` flag (dangerous if executions are on that state, but guard handles this)
- Adding new states and transitions
- Removing states and transitions (guarded — only safe if no non-terminal execution is currently on that state)

**v1 simplification:** the guard blocks ALL structural changes (states/transitions) if any non-terminal execution exists. Name-only changes are always allowed via a separate lightweight endpoint.

### 7.2 Port addition — `WorkflowExecutionRepository`

```java
boolean existsNonTerminalByWorkflowId(WorkflowId workflowId, Set<String> terminalStateCodes);
```

JPA implementation:
```java
// JpaWorkflowExecutionRepository
@Query("SELECT CASE WHEN COUNT(e) > 0 THEN true ELSE false END " +
       "FROM WorkflowExecutionEntity e " +
       "WHERE e.workflow.id = :workflowId " +
       "AND e.currentStateCode NOT IN :terminalStateCodes")
boolean existsNonTerminalByWorkflowId(
    @Param("workflowId") UUID workflowId,
    @Param("terminalStateCodes") Set<String> terminalStateCodes);
```

In-memory implementation: filter all executions for this workflowId, check if any has a `currentStateCode` not in `terminalStateCodes`.

### 7.3 `UpdateWorkflowUseCase`

```java
@Service
public class UpdateWorkflowUseCase {

    private final WorkflowRepository workflowRepository;
    private final WorkflowExecutionRepository executionRepository;

    @Transactional
    public Workflow execute(WorkflowId workflowId, String name,
                            List<State> states, List<Transition> transitions,
                            State initialState) {

        workflowRepository.findById(workflowId)
            .orElseThrow(() -> new WorkflowNotFoundException("Workflow not found"));

        Set<String> terminalCodes = states.stream()
            .filter(State::terminal)
            .map(State::code)
            .collect(Collectors.toSet());

        if (executionRepository.existsNonTerminalByWorkflowId(workflowId, terminalCodes)) {
            throw new WorkflowHasActiveExecutionsException(
                "Cannot modify workflow with non-terminal executions");
        }

        // The Workflow constructor re-runs all domain validation
        Workflow updated = new Workflow(workflowId, name, states, transitions, initialState);
        workflowRepository.save(updated);
        return updated;
    }
}
```

### 7.4 New exception

```java
public class WorkflowHasActiveExecutionsException extends RuntimeException {
    public WorkflowHasActiveExecutionsException(String message) { super(message); }
}
```

Register in `GlobalExceptionHandler` → 409 Conflict.

### 7.5 Controller

Reuses the same `CreateWorkflowRequest` DTO and mapper — the body is identical to create.

```java
@PutMapping("/workflows/{workflowId}")
@Operation(summary = "Replace a workflow definition")
@ApiResponse(responseCode = "200", description = "Workflow updated")
@ApiResponse(responseCode = "404", description = "Workflow not found")
@ApiResponse(responseCode = "409", description = "Workflow has non-terminal executions")
public WorkflowDetailResponse updateWorkflow(
        @PathVariable UUID workflowId,
        @Valid @RequestBody CreateWorkflowRequest request) {

    Map<String, State> statesByCode = workflowRequestMapper.buildStateMap(request);
    List<Transition> transitions = workflowRequestMapper.buildTransitions(request, statesByCode);
    Workflow workflow = updateWorkflowUseCase.execute(
        new WorkflowId(workflowId),
        request.name(),
        List.copyOf(statesByCode.values()),
        transitions,
        statesByCode.get(request.initialState())
    );
    return workflowResponseMapper.toDetail(workflow);
}
```

---

## 8. DB Migration

### 8.1 Next migration: `V3__cascade_deletes.sql`

Add `ON DELETE CASCADE` to the FK constraints that must clean up when a workflow or execution is deleted.

```sql
-- Allow deleting a workflow to cascade to its states and transitions.
-- Executions are NOT cascaded — the use case guards against it.

ALTER TABLE state
    DROP CONSTRAINT fk_state_workflow,
    ADD CONSTRAINT fk_state_workflow
        FOREIGN KEY (workflow_id) REFERENCES workflow(id) ON DELETE CASCADE;

ALTER TABLE transition
    DROP CONSTRAINT fk_transition_workflow,
    ADD CONSTRAINT fk_transition_workflow
        FOREIGN KEY (workflow_id) REFERENCES workflow(id) ON DELETE CASCADE;

-- Allow deleting an execution to cascade to its history.
-- The use case guards against deleting non-terminal executions.

ALTER TABLE state_changed
    DROP CONSTRAINT fk_state_changed_execution,
    ADD CONSTRAINT fk_state_changed_execution
        FOREIGN KEY (execution_id) REFERENCES workflow_execution(id) ON DELETE CASCADE;
```

With these cascades:
- `DELETE FROM workflow WHERE id = ?` → also deletes its `state` and `transition` rows
- `DELETE FROM workflow_execution WHERE id = ?` → also deletes its `state_changed` rows

No extra cleanup code needed in the use cases.

### 8.2 JPA adapter implementation notes

```java
// WorkflowRepository
void deleteById(WorkflowId id) {
    repository.deleteById(id.value());
}

boolean existsByWorkflowId(WorkflowId id) { // on ExecutionRepository
    return repo.existsByWorkflow_Id(id.value());
}

// WorkflowExecutionRepository
void deleteById(WorkflowExecutionId id) {
    repo.deleteById(id.value());
}
```

---

## 9. Implementation Order

1. Write and apply `V3__cascade_deletes.sql`
2. Add port methods: `WorkflowRepository.deleteById()`, `WorkflowExecutionRepository.deleteById()`, `existsByWorkflowId()`, `existsNonTerminalByWorkflowId()`
3. Implement JPA adapters for new port methods
4. Implement InMemory adapters for new port methods
5. Add new exceptions and register in `GlobalExceptionHandler`
6. Create `DeleteWorkflowUseCase` + controller endpoint
7. Create `DeleteExecutionUseCase` + controller endpoint
8. Create `UpdateWorkflowUseCase` + controller endpoint
9. Frontend: delete buttons with confirmation dialogs
10. Frontend: pre-filled edit form using the same `WorkflowCreateComponent` flow

---

## 10. Tests

| Test | What to verify |
|---|---|
| **Unit — `DeleteWorkflowUseCase`** | Deletes successfully when no executions exist |
| **Unit — `DeleteWorkflowUseCase`** | Throws `WorkflowHasExecutionsException` when executions exist |
| **Unit — `DeleteWorkflowUseCase`** | Throws `WorkflowNotFoundException` for unknown ID |
| **Unit — `DeleteExecutionUseCase`** | Deletes successfully when execution is in a terminal state |
| **Unit — `DeleteExecutionUseCase`** | Throws `ExecutionNotTerminalException` when not terminal |
| **Unit — `UpdateWorkflowUseCase`** | Updates successfully when all executions are terminal |
| **Unit — `UpdateWorkflowUseCase`** | Throws `WorkflowHasActiveExecutionsException` when non-terminal executions exist |
| **Unit — `UpdateWorkflowUseCase`** | Re-runs domain validation (delegates to `Workflow` constructor) |
| **Integration — cascade** | Deleting a workflow cascades to its states and transitions |
| **Integration — cascade** | Deleting an execution cascades to its state_changed history |

---

## 11. Open Questions / Decisions Log

| Question | Decision | Rationale |
|---|---|---|
| Hard delete or soft delete? | **Hard delete** | Soft delete adds complexity (filter everywhere, UI confusion). v1 doesn't need audit trails beyond what `state_changed` already provides. |
| Delete execution: any state or terminal only? | **Terminal only** | Deleting a running execution is almost always a mistake. The guard forces callers to be intentional. |
| Delete workflow: block all executions or only active ones? | **Block all** | Even terminal executions hold FK references to the workflow's `state` rows. Allowing deletion would require cascading through execution and history data, which is destructive and irreversible. |
| Modify: PUT (full replace) or PATCH (partial)? | **PUT** | Full replace reuses the existing `CreateWorkflowRequest` DTO and mapper. Partial update would require nullable fields and merge logic — not worth the complexity for v1. |
| State code immutability | **Codes cannot change** | State codes are stored directly in `state_changed` and `workflow_execution` as stable FKs. Changing them would break the history. Guard this at the use case level if needed in v2. |

---

## 12. Changelog

| Date | Change |
|---|---|
| 2026-06-22 | Initial spec |
