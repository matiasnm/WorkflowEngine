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
- [ ] Skeleton loading components (reusable shimmer pattern)
- [ ] Shell-level error handling (global toast/snackbar)
- [ ] Workflow list search/filter — [spec](features/frontend-polish.md)

---

## Future (unplanned)

- [ ] Workflow versioning
- [ ] Event sourcing
- [ ] Parallel states
- [ ] Timers
- [ ] Retry policies
- [ ] Conditional transitions (guards)
- [ ] Role-based transitions
- [ ] Visual workflow graph (D3.js / vis-network)
- [ ] WebSocket real-time updates
