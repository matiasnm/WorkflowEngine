# Feature: Execution Context (Metadata)

Allow callers to attach arbitrary JSON data to an execution when starting it. This context is stored, returned on queries, and available for future use in transition guards.

## Status

- **Iteration:** v0.6
- **Backend:** ❌ Not implemented
- **Frontend:** ❌ Not implemented
- **Dependencies:** Webhook feature (`callbackUrl` on execution) — both modify `WorkflowExecution` and `StartExecutionRequest`; implement together or sequentially

---

## Table of Contents

1. [Motivation](#1-motivation)
2. [Scope](#2-scope)
3. [Design Decision — Format](#3-design-decision--format)
4. [Domain Model](#4-domain-model)
5. [Persistence](#5-persistence)
6. [API Changes](#6-api-changes)
7. [Implementation Order](#7-implementation-order)
8. [Tests](#8-tests)
9. [Open Questions / Decisions Log](#9-open-questions--decisions-log)
10. [Changelog](#10-changelog)

---

## 1. Motivation

A workflow execution today is just a state machine pointer — it knows its current state and its history of transitions, but nothing about *why* it was started or *what* it represents in the business domain.

In practice, every caller needs to attach context: which order, which customer, which document, which request triggered this execution. Without this, the caller must maintain their own external mapping (`orderId → executionId`) and cannot retrieve any meaningful data when polling the execution.

This is the minimum required for the engine to be usable in real integrations.

**Example use cases:**
- An order approval flow: `{ "orderId": "ORD-123", "amount": 4500, "currency": "USD" }`
- An employee onboarding flow: `{ "employeeId": "EMP-42", "department": "Engineering" }`
- A document review flow: `{ "documentUrl": "https://...", "reviewerId": "USR-7" }`

---

## 2. Scope

### In Scope

| Layer | Deliverable |
|---|---|
| **Domain** | `context` field (`Map<String, Object>`, nullable) on `WorkflowExecution` |
| **Persistence** | `context TEXT` column on `workflow_execution` (JSON-serialized) |
| **Persistence** | DB migration to add the column |
| **API — write** | `POST /workflows/{id}/executions` accepts optional `context` in the request body |
| **API — read** | `GET /executions/{id}` response includes `context` |
| **API — read** | `GET /workflows/{id}/executions` list items include `context` |
| **Frontend** | Display `context` as a key-value table on execution detail page |

### Out of Scope

- Context validation against a schema defined per-workflow — v2
- Querying executions by context field values (`?context.orderId=123`) — v2
- Updating context after the execution is started — not allowed; context is immutable once set
- PostgreSQL `JSONB` type for indexable JSON queries — use `TEXT` for v1 (works on both H2 and PG)

---

## 3. Design Decision — Format

**Chosen: free-form JSON (`Map<String, Object>`).**

| Option | Pros | Cons |
|---|---|---|
| Free-form JSON | No schema to maintain, flexible for any use case, industry standard (Temporal, Camunda) | No server-side validation |
| Key-value pairs `[{key, value}]` | Structured, easy to render | Verbose, awkward for nested data |
| Typed fields per-workflow definition | Strongly typed, validated | Complex to implement, requires workflow schema change |

For v1, free-form JSON is the right default. The engine does not need to understand the context — it just stores and returns it. Callers can validate it themselves.

---

## 4. Domain Model

### 4.1 `WorkflowExecution`

Add `context` as an immutable field. The context is set at creation time and never changes — transitions preserve it via `withTransition()`.

```java
public class WorkflowExecution {

    private final WorkflowExecutionId id;
    private final WorkflowId workflowId;
    private final State currentState;
    private final List<StateChanged> history;
    private final String callbackUrl;       // from webhook feature
    private final Map<String, Object> context;  // NEW

    // No-context constructor — existing callers unaffected
    public WorkflowExecution(WorkflowExecutionId id, WorkflowId workflowId, State currentState) {
        this(id, workflowId, currentState, List.of(), null, null);
    }

    // With callbackUrl + context
    public WorkflowExecution(WorkflowExecutionId id, WorkflowId workflowId, State currentState,
                             String callbackUrl, Map<String, Object> context) {
        this(id, workflowId, currentState, List.of(), callbackUrl, context);
    }

    // Reconstruction constructor
    public WorkflowExecution(WorkflowExecutionId id, WorkflowId workflowId, State currentState,
                             List<StateChanged> history, String callbackUrl, Map<String, Object> context) {
        this.id = id;
        this.workflowId = workflowId;
        this.currentState = currentState;
        this.history = new ArrayList<>(history);
        this.callbackUrl = callbackUrl;
        this.context = context != null ? Map.copyOf(context) : Map.of();
    }

    public Map<String, Object> getContext() { return context; }

    // context is carried forward on every transition
    public WorkflowExecution withTransition(State target, StateChanged event) {
        List<StateChanged> newHistory = new ArrayList<>(this.history);
        newHistory.add(event);
        return new WorkflowExecution(id, workflowId, target, newHistory, callbackUrl, context);
    }
}
```

`Map.copyOf()` makes the context field truly immutable at the domain level.

---

## 5. Persistence

### 5.1 DB Migration — `V4__add_execution_context.sql`

```sql
ALTER TABLE workflow_execution
    ADD COLUMN context TEXT;
```

Nullable — existing executions have no context.

> Note: if this is implemented in the same iteration as the webhook feature (`callbackUrl`), combine into a single migration `V4__add_execution_fields.sql`.

### 5.2 `WorkflowExecutionEntity`

```java
@Column(name = "context", columnDefinition = "TEXT")
private String context;  // JSON string, nullable

// getter + setter
```

### 5.3 Mapper — `WorkflowExecutionMapper`

Inject `ObjectMapper` (Jackson — already on the classpath via Spring Boot) to serialize/deserialize.

```java
@Component
public class WorkflowExecutionMapper {

    private final ObjectMapper objectMapper;

    public WorkflowExecutionMapper(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public WorkflowExecution toDomain(WorkflowExecutionEntity entity, Workflow workflow) {
        State currentState = resolveState(entity.getCurrentStateCode(), workflow);
        List<StateChanged> history = mapHistory(entity, workflow);
        Map<String, Object> context = deserializeContext(entity.getContext());

        return new WorkflowExecution(
            new WorkflowExecutionId(entity.getId()),
            workflow.getId(),
            currentState,
            history,
            entity.getCallbackUrl(),
            context
        );
    }

    public WorkflowExecutionEntity toEntity(WorkflowExecution execution, WorkflowEntity workflowRef) {
        WorkflowExecutionEntity entity = new WorkflowExecutionEntity();
        entity.setId(execution.getId().value());
        entity.setWorkflow(workflowRef);
        entity.setCurrentStateCode(execution.getCurrentState().code());
        entity.setCallbackUrl(execution.getCallbackUrl());
        entity.setContext(serializeContext(execution.getContext()));
        // history mapped separately
        return entity;
    }

    private Map<String, Object> deserializeContext(String json) {
        if (json == null || json.isBlank()) return Map.of();
        try {
            return objectMapper.readValue(json, new TypeReference<Map<String, Object>>() {});
        } catch (JsonProcessingException e) {
            return Map.of(); // corrupt data — return empty rather than crash
        }
    }

    private String serializeContext(Map<String, Object> context) {
        if (context == null || context.isEmpty()) return null;
        try {
            return objectMapper.writeValueAsString(context);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Failed to serialize execution context", e);
        }
    }
}
```

---

## 6. API Changes

### 6.1 `StartExecutionRequest` DTO

If the webhook feature is implemented at the same time, this DTO already exists with `callbackUrl`. Add `context` to it:

```java
public record StartExecutionRequest(
    @Nullable String callbackUrl,
    @Nullable Map<String, Object> context
) {}
```

If implementing context alone, create the DTO now.

### 6.2 `StartWorkflowExecutionUseCase`

Add an overload accepting both fields, or update the existing one:

```java
@Transactional
public WorkflowExecution execute(WorkflowId workflowId, String callbackUrl, Map<String, Object> context) {
    Workflow workflow = workflowRepository.findById(workflowId)
        .orElseThrow(() -> new WorkflowNotFoundException("Workflow not found"));

    WorkflowExecution execution = new WorkflowExecution(
        new WorkflowExecutionId(UUID.randomUUID()),
        workflow.getId(),
        workflow.getInitialState(),
        callbackUrl,
        context
    );

    executionRepository.save(execution);
    return execution;
}
```

### 6.3 `ExecutionController` — start endpoint

```java
@PostMapping("/workflows/{workflowId}/executions")
public WorkflowExecutionCreatedResponse start(
        @PathVariable UUID workflowId,
        @RequestBody(required = false) StartExecutionRequest request) {
    String callbackUrl = request != null ? request.callbackUrl() : null;
    Map<String, Object> context = request != null ? request.context() : null;
    return new WorkflowExecutionCreatedResponse(
        startUseCase.execute(new WorkflowId(workflowId), callbackUrl, context).getId().value()
    );
}
```

### 6.4 `ExecutionResponse` DTO

Add `context` field:

```java
public record ExecutionResponse(
    String id,
    String workflowId,
    StateDefinition currentState,
    String currentStateSince,
    Map<String, Object> context  // NEW — null when not set
) {}
```

Update `ExecutionResponseMapper` to map `execution.getContext()`.

### 6.5 Example request / response

**Start with context:**
```http
POST /workflows/7b2c.../executions
Content-Type: application/json

{
  "context": {
    "orderId": "ORD-123",
    "amount": 4500,
    "currency": "USD",
    "customer": "acme-corp"
  }
}
```

**Get execution — response:**
```json
{
  "id": "3f1a...",
  "workflowId": "7b2c...",
  "currentState": { "code": "PENDING", "name": "Pending" },
  "currentStateSince": "2026-06-22T14:30:00Z",
  "context": {
    "orderId": "ORD-123",
    "amount": 4500,
    "currency": "USD",
    "customer": "acme-corp"
  }
}
```

---

## 7. Implementation Order

1. Write and apply DB migration (`V4__add_execution_context.sql` or combined with callbackUrl)
2. Add `context` field to `WorkflowExecution` domain model (all constructors + `withTransition()`)
3. Add `context` column to `WorkflowExecutionEntity`
4. Update `WorkflowExecutionMapper` — add `ObjectMapper` injection, serialize/deserialize methods
5. Update `InMemoryWorkflowExecutionRepository` — no structural change needed (carries on the domain object)
6. Create or update `StartExecutionRequest` DTO
7. Update `StartWorkflowExecutionUseCase.execute()` to accept `context`
8. Update `ExecutionController.start()` to read `context` from request body
9. Add `context` to `ExecutionResponse` DTO
10. Update `ExecutionResponseMapper` to map `context`
11. Frontend: render `context` as a key-value table on execution detail page

---

## 8. Tests

| Test | What to verify |
|---|---|
| **Unit — `WorkflowExecution`** | `getContext()` returns the map passed at construction |
| **Unit — `WorkflowExecution`** | `withTransition()` preserves `context` on the new instance |
| **Unit — `WorkflowExecution`** | Constructed without context → `getContext()` returns empty map (not null) |
| **Unit — `StartWorkflowExecutionUseCase`** | Saved execution carries the provided context |
| **Unit — mapper** | `serializeContext` produces valid JSON string |
| **Unit — mapper** | `deserializeContext` parses JSON back to the original map |
| **Unit — mapper** | Null or blank JSON → returns empty map, no exception |
| **Integration — round-trip** | Start execution with context → get execution → context matches |
| **Integration — round-trip** | Start execution without context → get execution → context is null or empty |

---

## 9. Open Questions / Decisions Log

| Question | Decision | Rationale |
|---|---|---|
| Free-form JSON vs typed fields | **Free-form JSON** | Engine doesn't need to understand the context. Callers own their schema. Most comparable engines (Temporal, Camunda, etc.) use the same approach. |
| `TEXT` vs `JSONB` in PostgreSQL | **`TEXT` for v1** | Works on both H2 (tests) and PostgreSQL. Can migrate to `JSONB` later via Flyway when querying by context field values is needed. |
| Is context mutable after creation? | **No — immutable** | Context is the snapshot of *why* the execution was started. Changing it after the fact would corrupt the audit trail. |
| Max context size? | **Unspecified for v1** | Add a validation (e.g., max 16 KB serialized) in v2 when abusive payloads become a concern. |
| Expose context in execution list (paginated)? | **Yes** | The list response already maps to `ExecutionResponse`. Callers need context to identify which execution belongs to which entity without a separate GET. |

---

## 10. Changelog

| Date | Change |
|---|---|
| 2026-06-22 | Initial spec |
