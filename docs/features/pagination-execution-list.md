# Feature: Pagination for Execution List

Add pagination support to `GET /workflows/{workflowId}/executions` so the endpoint does not return all executions at once.

## Status

- **Iteration:** v0.4 (Hardening & Spring Events)
- **Backend:** ❌ Not implemented
- **Frontend:** ❌ Not implemented
- **Dependencies:** None

---

## 1. Motivation

The current `GET /workflows/{workflowId}/executions` returns **all executions** for a workflow with no limit. As usage grows:

- A workflow with hundreds or thousands of executions becomes slow to load
- The frontend receives a large JSON payload, increasing render time
- There is no graceful degradation — the endpoint does not warn about large result sets

This feature adds standard pagination (page number + page size), keeping backward compatibility by defaulting to a reasonable page size.

---

## 2. Scope

### In Scope

| Layer | Deliverable |
|---|---|
| **Backend — use case** | Update `ListExecutionsUseCase` to accept pagination parameters |
| **Backend — port** | Update `WorkflowExecutionRepository.findByWorkflowId` signature (or add overload) |
| **Backend — JPA adapter** | Use Spring Data `Pageable` in the query derivation |
| **Backend — in-memory adapter** | Implement in-memory pagination (slice + skip) |
| **Backend — REST** | Add `page` and `size` query params to `GET /workflows/{workflowId}/executions` |
| **Backend — response** | Wrap result in a page envelope with total count, page, size |
| **Frontend — model** | Add `Page<ExecutionResponse>` type or paginated response interface |
| **Frontend — service** | Update `listExecutions()` to accept `page`/`size` params |
| **Frontend — component** | Add pagination controls to `ExecutionListComponent` |

### Out of Scope

- Sorting / filtering by state, date range, etc.
- Cursor-based pagination (keyset) — page/offset is sufficient for current scale
- Infinite scroll — explicit page controls are simpler and more predictable

---

## 3. API Contract

### Current (v0.2)

```
GET /workflows/{workflowId}/executions
→ 200 { "id": ..., "workflowId": ..., "currentState": ..., "currentStateSince": ... }[]
```

### New (v0.4)

```
GET /workflows/{workflowId}/executions?page=0&size=20
```

#### Request Parameters

| Parameter | Type | Location | Required | Default | Description |
|---|---|---|---|---|---|
| `workflowId` | `UUID` | Path | Yes | — | The workflow's UUID |
| `page` | `int` | Query | No | `0` | Zero-based page index |
| `size` | `int` | Query | No | `20` | Page size (max 100) |

#### Response `200 OK`

```json
{
  "content": [
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
  ],
  "page": 0,
  "size": 20,
  "totalElements": 42,
  "totalPages": 3
}
```

- `page` / `size` echo the request parameters
- `totalElements` is the total number of executions for the workflow (not just this page)
- `totalPages` = ceil(`totalElements` / `size`)

#### Error Responses

| Status | Condition |
|---|---|
| `400` | `page` or `size` is negative |
| `400` | `size` exceeds 100 |
| `404` | Workflow not found |

---

## 4. Frontend Contract

### 4.1 Model

Add to `execution.model.ts`:

```typescript
export interface Page<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}
```

### 4.2 Service

Update `ExecutionApiService.listExecutions()`:

```typescript
listExecutions(workflowId: string, page = 0, size = 20): Observable<Page<ExecutionResponse>> {
  return this.http.get<Page<ExecutionResponse>>(
    `${this.config.apiBaseUrl}/workflows/${workflowId}/executions`,
    { params: { page: String(page), size: String(size) } }
  );
}
```

### 4.3 Component Changes

`ExecutionListComponent` changes:

- **New inputs**: `pageSize?: number` (default 20)
- **New reactive state**: `page`, `totalPages`, `totalElements`
- **Pagination controls**: "Previous" / "Next" buttons with page indicator ("Page 1 of 3")
- **Button states**: Previous disabled on first page, Next disabled on last page. Buttons show spinner while loading a new page.
- **Reload on page change**: When user clicks Next/Previous, component fetches the new page and scrolls to top of the execution list.

#### UI States

| State | Visual |
|---|---|
| **Single page** (totalPages ≤ 1) | No pagination controls shown — same as current v0.2 behavior |
| **Multi-page** | "← Previous · Page 2 of 5 · Next →" centered below the execution rows |
| **Loading new page** | Current list fades slightly (opacity 0.5) + spinner over pagination controls. Previous/Next buttons disabled during load. |

---

## 5. Tests

### Backend

| Test level | What to test |
|---|---|
| **Unit — UseCase** | `ListExecutionsUseCase` passes `Pageable` to repository and returns paginated result |
| **Unit — JPA Repository** | `findByWorkflowId` with `Pageable` returns correct slice |
| **Unit — InMemory Adapter** | In-memory pagination returns correct slice and total count |
| **Integration — Controller** | `GET /workflows/{id}/executions?page=0&size=2` returns paginated JSON envelope |
| **Integration — Controller** | Default parameters when none provided (page=0, size=20) |
| **Integration — Controller** | Out-of-range page returns empty content slice |

### Frontend

| Test level | What to test |
|---|---|
| **Unit — Service** | `listExecutions()` sends `page` and `size` as query params |
| **Unit — Component** | Single page hides pagination controls |
| **Unit — Component** | Multi-page shows pagination controls |
| **Unit — Component** | Clicking Next fetches next page |
| **Unit — Component** | Previous disabled on first page |
| **Unit — Component** | Next disabled on last page |

---

## 6. Backward Compatibility

The change is fully backward compatible:
- Existing callers that omit `page`/`size` get `page=0&size=20` by default
- The response envelope is **new** (was an array, now a JSON object with `content` array) — this is a **breaking change** for any existing frontend
- Mitigation: the frontend is the only consumer, and we update it in the same iteration

> **Decision**: Accept the breaking change since the frontend is updated atomically in the same v0.4 iteration. If a future version needs backward compatibility for external API consumers, introduce a new endpoint version (e.g., `/v2/workflows/{id}/executions`).

---

## 7. Backend Implementation Plan

| Step | File | Change |
|---|---|---|
| 1 | `WorkflowExecutionRepository` (port) | Change `findByWorkflowId(WorkflowId)` to return `Page<WorkflowExecution>` — or add overload `findByWorkflowId(WorkflowId, Pageable)` |
| 2 | `ListExecutionsUseCase` | Accept `Pageable` parameter, return `Page<WorkflowExecution>` |
| 3 | `JpaWorkflowExecutionRepository` | Change method to accept `Pageable`: `Page<WorkflowExecutionEntity> findByWorkflowIdWorkflowId(UUID workflowId, Pageable pageable)` |
| 4 | `JpaWorkflowExecutionPersistenceAdapter` | Pass `Pageable` through, map `Page` content |
| 5 | `InMemoryWorkflowExecutionRepository` | Implement pagination: skip + limit on sorted list, return `Page` |
| 6 | `ExecutionController` | Accept `@RequestParam(defaultValue = "0") int page` and `@RequestParam(defaultValue = "20") int size`, pass `PageRequest.of(page, size)` |
| 7 | `ExecutionResponse` or new response DTO | Wrap list in a paginated envelope DTO |

---

## 8. Open Questions / Decisions Log

| Question | Decision | Rationale |
|---|---|---|
| Page or cursor pagination? | **Page-based** | Simpler to implement and use at current scale. Cursor-based can be added later if needed. |
| Breaking change to response format? | **Accept it** | Only consumer is the frontend, updated atomically in the same iteration. |
| Default page size? | **20** | Reasonable default for the expected volume. Max cap at 100 prevents abuse. |
| Pagination in in-memory adapter? | **Yes** | Needed for tests using `dev-memory` profile. Implement as skip+limit on sorted list. |

---

## 9. Changelog

| Date | Change |
|---|---|
| 2026-06-19 | Initial spec |
