# Roadmap

> See feature specs in [docs/features/](features/) for detailed scope, API contracts, and acceptance criteria.

## MVP (v0.1)
- [x] Workflow definition
- [x] State transitions
- [x] Event history
- [x] Domain service
- [x] CQRS use cases
- [x] Persistence (JPA + PostgreSQL + Flyway)
- [x] REST endpoints
- [x] Angular library + shell demo app

---

## v0.2 — Execution List

- [x] Execution list feature — [spec](features/execution-list.md)

---

## v0.3 — Create Workflow UI

- [x] Create workflow form — [spec](features/workflow-create.md)

---

## v0.4 — Hardening & Spring Events ✅

### Backend hardening
- [x] Pagination for execution list — [spec](features/pagination-execution-list.md)
- [x] GlobalExceptionHandler coverage (`WorkflowExecutionNotFound`, missing handlers)
- [x] Domain events with `EventPublisher` port + Spring Events adapter — [spec](features/domain-events.md)

### Documentation
- [x] OpenAPI / Swagger docs (`springdoc-openapi`)
- [x] ADR: event publishing strategy (Spring Events vs Kafka)

### Frontend polish
- [x] Skeleton loading components (reusable shimmer pattern)
- [x] Shell-level error handling (global toast/snackbar)
- [x] Workflow list search/filter — [spec](features/frontend-polish.md)

### Frontend polish iteration 2
- [x] Move "New Workflow" button to navbar
- [x] Back navigation after create → home
- [x] Back button on executions page
- [x] Executions tab: aggregate per-workflow API calls via `WorkflowCacheService`
- [x] Auto-create transitions when adding states
- [x] History toggle: detail vs condensed view
- [x] Remove redundant toast + inline error for load failures

---

## v0.5 — Workflow & Execution CRUD ✅

- [x] Delete workflow (guarded: blocks if any executions exist) — [spec](features/v1/workflow-execution-crud.md)
- [x] Delete execution (guarded: terminal state only) — [spec](features/v1/workflow-execution-crud.md)
- [x] Modify/update workflow (PUT, with smart edit-constraint validation) — [spec](features/v1/workflow-execution-crud.md)
- [x] Pre-flight editability endpoint (`GET /workflows/{id}/editable`)
- [x] Frontend: delete buttons with confirmation dialogs
- [x] Frontend: pre-filled edit workflow form
- [x] DB cascade deletes (Flyway V3)

---

## v0.6 — Integrations (planned)

### Backend
- [ ] Observability: Prometheus metrics + structured JSON logging + Grafana — [spec](features/v1/observability-and-webhooks.md)
- [ ] Webhooks: per-execution callback URL — [spec](features/v1/observability-and-webhooks.md)
- [x] Execution context (metadata) — [spec](features/v1/execution-context.md)
- [x] API key authentication — [spec](features/v1/api-key-auth.md)

---

## v2 (future, unplanned)

- [ ] Transition guards — [spec](features/v2/transition-guards.md)
- [ ] State timeouts / SLAs — [spec](features/v2/state-timeouts-slas.md)
- [ ] Workflow versioning — [spec](features/v2/workflow-versioning.md)
- [ ] Role-based transitions — [spec](features/v2/role-based-transitions.md)
- [ ] Retry policies — [spec](features/v2/retry-policies.md)
- [ ] WebSocket real-time updates — [spec](features/v2/websocket-realtime.md)
- [ ] Visual workflow graph — [spec](features/v2/visual-workflow-graph.md)
- [ ] Parallel states — [spec](features/v2/parallel-states.md)
- [ ] Event sourcing
