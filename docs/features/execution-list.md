# Feature: Execution List

List all `WorkflowExecution` instances belonging to a `Workflow`.

## Status

- **Iteration:** v0.2 (post-MVP)
- **Backend:** ❌ Not implemented
- **Frontend:** ❌ Not implemented
- **Dependencies:** None

---

## 1. Motivation

The MVP allows starting an execution and navigating to its detail view, but there is **no way to go back** to an existing execution once you leave it. The only path to an execution today is:

1. Open Workflow Detail
2. Click "Start Execution"
3. Navigate to `/executions/{id}`

If you navigate away, that execution is **lost** unless you remember its UUID and type it manually.

This feature adds a **visible list of executions** per workflow, so users can:

- See all executions that have been started for a workflow
- Click any execution to view its detail (current state, history)
- Know at a glance which executions are in which state

---

## 2. Scope

### In Scope

| Layer | Deliverable |
|---|---|
| **Backend application** | `ListExecutionsUseCase` — query use case |
| **Backend port** | `WorkflowExecutionRepository.findByWorkflowId(WorkflowId)` |
| **Backend JPA adapter** | Query derivation `findByWorkflowIdWorkflowId()` |
| **Backend in-memory adapter** | HashMap lookup by `WorkflowId` |
| **Backend REST** | `GET /workflows/{workflowId}/executions` |
| **Frontend service** | `ExecutionApiService.listExecutions(workflowId)` |
| **Frontend component** | `ExecutionListComponent` — standalone, with loading/empty/error/success states |
| **Frontend integration** | Embedded in `WorkflowDetailComponent` below the "Start Execution" button |

### Out of Scope (explicitly NOT included)

- Pagination — assumed low volume per workflow; can be added later
- Sorting / filtering — returns most-recent-first; no filter UI
- Search by state, date range, etc.
- Delete or cancel executions
- Real-time updates (WebSocket / polling)

---

## 3. API Contract

### Backend

#### `GET /workflows/{workflowId}/executions`

**Request:**

```
GET /workflows/{workflowId}/executions
```

| Parameter | Type | Location | Required | Description |
|---|---|---|---|---|
| `workflowId` | `UUID` | Path | Yes | The workflow's UUID |

**Response `200 OK`:**

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "workflowId": "660e8400-e29b-41d4-a716-446655440001",
    "currentState": {
      "code": "in_review",
      "name": "IN REVIEW",
      "terminal": false
    },
    "currentStateSince": "2026-06-19T10:05:00Z"
  }
]
```

- Returns **all executions** for the given workflow, ordered by creation date descending (most recent first).
- `currentStateSince` is the ISO-8601 timestamp of when the execution entered its current state (i.e., the `timestamp` of the last `StateChanged` event).
- If an execution has no history events, `currentStateSince` is `null`.
- `200` always — if no executions exist, returns `[]`.

#### Backend Implementation Plan

| Step | File | Change |
|---|---|---|
| 1 | `WorkflowExecutionRepository` (port) | Add `List<WorkflowExecution> findByWorkflowId(WorkflowId workflowId)` |
| 2 | `ListExecutionsUseCase` (NUEVO) | `@Service`, `@Transactional(readOnly = true)`, calls `repository.findByWorkflowId()` |
| 3 | `JpaWorkflowExecutionRepository` | Add `List<WorkflowExecutionEntity> findByWorkflowIdWorkflowId(UUID workflowId)` |
| 4 | `JpaWorkflowExecutionPersistenceAdapter` | Implement `findByWorkflowId`: load entities, map to domain via `WorkflowExecutionMapper` |
| 5 | `InMemoryWorkflowExecutionRepository` | Implement `findByWorkflowId`: filter `storage.values()` by workflowId |
| 6 | `ExecutionController` | Add `GET /workflows/{workflowId}/executions` → delegates to `ListExecutionsUseCase` |
| 7 | `ExecutionResponseMapper` | Add `currentStateSince` field to `ExecutionResponse` (extract from last `StateChanged` timestamp) |

---

## 4. Frontend Contract

### 4.1 Service

```typescript
// ExecutionApiService — new method
listExecutions(workflowId: string): Observable<ExecutionResponse[]>
```

The existing `ExecutionResponse` model already includes the optional `currentStateSince?: string` field.

### 4.2 Component: `ExecutionListComponent`

**Selector:** `we-execution-list`

**Standalone:** Yes

**Imports:** `DatePipe` (Angular Common)

#### Inputs

| Name | Type | Required | Description |
|---|---|---|---|
| `workflowId` | `string` | Yes | Workflow UUID to load executions for |

#### Outputs

| Name | Event type | Description |
|---|---|---|
| `executionSelected` | `string` (execution UUID) | Emitted when user clicks an execution |
| `errorEvent` | `string` | Emitted on API error, for host app integration (toast, etc.) |

#### Reactive State

```typescript
readonly loading = signal(true);
readonly error = signal<string | null>(null);
readonly executions = signal<ExecutionResponse[]>([]);
```

#### UI States

| State | Visual |
|---|---|
| **Loading** | Skeleton: 3 rows with shimmer (mimicking a table row) |
| **Empty** | "No executions yet. Start one above." with a subtle dashed border box |
| **Error** | ⚠ inline error message (no retry — parent `WorkflowDetailComponent` handles retry) |
| **Success** | Table/list of executions. Each row shows: truncated ID (`a1b2...`), current state name + code, and "Since" timestamp |

#### Interaction

- Click on a row → emits `executionSelected` with the execution UUID
- The host app (shell) navigates to `/executions/{id}`
- No hover/active states beyond standard CSS (`cursor: pointer`)

#### Template Structure (simplified)

```
┌──────────────────────────────────────┐
│  Executions                    ← h3  │
│                                      │
│  [Loading... skeleton 3 rows]        │
│                                      │
│  [Empty state]                       │
│  ┌──────────────────────────────┐   │
│  │  No executions yet.          │   │
│  │  Start one above.            │   │
│  └──────────────────────────────┘   │
│                                      │
│  [Error state]                       │
│  ⚠ Failed to load executions.       │
│                                      │
│  [Data loaded]                       │
│  ┌──────────────────────────────┐   │
│  │ a1b2...  IN_REVIEW  Since    │   │
│  │          10:05 AM            │   │  ← clickable
│  ├──────────────────────────────┤   │
│  │ c3d4...  CREATED    Since    │   │
│  │          10:00 AM            │   │  ← clickable
│  └──────────────────────────────┘   │
└──────────────────────────────────────┘
```

### 4.3 Integration in WorkflowDetailComponent

Add a new section **below** the "Start Execution" button:

```html
<!-- After the existing actions section -->
<section class="we-workflow-detail__executions">
  <h3 class="we-workflow-detail__section-title">Executions</h3>
  <we-execution-list
    [workflowId]="workflowId()"
    (executionSelected)="onExecutionSelected($event)"
    (errorEvent)="errorEvent.emit($event)"
  />
</section>
```

The `WorkflowDetailComponent` needs a new method:

```typescript
// New output
@Output() executionSelected = new EventEmitter<string>();

protected onExecutionSelected(executionId: string): void {
  this.executionSelected.emit(executionId);
}
```

The `WorkflowDetailPageComponent` (shell) already handles navigation via `executionCreated`; it should also handle `executionSelected` the same way (navigate to `/executions/{id}`).

### 4.4 CSS Design System

- Uses existing `--we-*` custom properties
- No new CSS variables needed
- Table/card styles follow the same patterns as `WorkflowListComponent`
- Truncated execution ID uses `font-family: monospace` for clarity

---

## 5. Tests

### Backend

| Test level | What to test |
|---|---|
| **Unit — UseCase** | `ListExecutionsUseCase` calls `repository.findByWorkflowId` and returns results |
| **Unit — JPA Repository** | Spring Data query derivation works: `findByWorkflowIdWorkflowId` returns entities |
| **Unit — Persistence Adapter** | `JpaWorkflowExecutionPersistenceAdapter.findByWorkflowId` maps entities to domain correctly |
| **Unit — InMemory Adapter** | `InMemoryWorkflowExecutionRepository.findByWorkflowId` filters correctly |
| **Integration — Controller** | `GET /workflows/{id}/executions` returns 200 with expected body |
| **E2E** | Full flow: create workflow → start 2 executions → list executions → verify both appear |

### Frontend

| Test level | What to test |
|---|---|
| **Unit — Service** | `listExecutions()` calls `GET /workflows/{id}/executions`, returns `ExecutionResponse[]` |
| **Unit — Component** | Loading state renders skeleton |
| **Unit — Component** | Empty state renders "No executions yet" message |
| **Unit — Component** | Error state renders error message |
| **Unit — Component** | Success state renders execution rows |
| **Unit — Component** | Click on row emits `executionSelected` with correct UUID |
| **Unit — Integration** | `WorkflowDetailComponent` shows executions section when executions exist |

---

## 6. Open Questions / Decisions Log

| Question | Decision | Rationale |
|---|---|---|
| Pagination? | **Not for v0.2** | Low volume expected; can add `pageable` later without breaking changes |
| Order? | **Most recent first** | Users care about recent executions; matches UX convention |
| Where to show list? | **Inline in WorkflowDetailComponent** | Avoids extra page/navigation; user sees executions + can start new ones in one view |
| `currentStateSince` field? | **Yes, add to backend response** | Already defined as optional in frontend model (`ExecutionResponse.currentStateSince?: string`); backend just needs to populate it |

---

## 7. Changelog

| Date | Change |
|---|---|
| 2026-06-19 | Initial spec |
