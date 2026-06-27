# Roadmap

> See feature specs in [docs/features/](features/) for detailed scope, API contracts, and acceptance criteria.

---

## ✅ v1 — Complete (all v0.x iterations delivered)

All features for the first stable release are implemented, tested, and documented.

### v0.1 — MVP
- [x] Workflow definition (states, transitions, initial state)
- [x] State transitions with domain validation
- [x] Event history (StateChanged domain events)
- [x] Pure domain service (WorkflowEngine)
- [x] CQRS command/query use cases
- [x] Persistence (JPA + PostgreSQL + Flyway + H2)
- [x] REST endpoints (create, list, get, transition, history)
- [x] Angular library + shell demo app

### v0.2 — Execution List
- [x] Execution list feature — [spec](features/v1/execution-list.md)

### v0.3 — Create Workflow UI
- [x] Create workflow form — [spec](features/v1/workflow-create.md)

### v0.4 — Hardening & Domain Events
- [x] Pagination for execution list — [spec](features/v1/pagination-execution-list.md)
- [x] GlobalExceptionHandler coverage
- [x] Domain events with `EventPublisher` port + Spring Events adapter — [spec](features/v1/domain-events.md)
- [x] OpenAPI / Swagger docs (springdoc-openapi)
- [x] ADR: event publishing strategy — [docs/adr/ADR-0001-event-publishing-strategy.md](../docs/adr/ADR-0001-event-publishing-strategy.md)
- [x] Skeleton loading components (shimmer pattern)
- [x] Shell-level error handling (global toast)
- [x] Workflow list search/filter — [spec](features/v1/frontend-polish.md)
- [x] UI polish iteration 2 — [spec](features/v1/frontend-polish-iteration-2.md)
- [x] State colors — [spec](features/v1/state-colors.md)

### v0.5 — Workflow & Execution CRUD
- [x] Delete workflow (guarded: blocks if executions exist) — [spec](features/v1/workflow-execution-crud.md)
- [x] Delete execution (guarded: terminal state only) — [spec](features/v1/workflow-execution-crud.md)
- [x] Modify/update workflow (PUT with edit-constraint validation) — [spec](features/v1/workflow-execution-crud.md)
- [x] Pre-flight editability endpoint (`GET /workflows/{id}/editable`)
- [x] Frontend: delete buttons with confirmation dialogs
- [x] Frontend: pre-filled edit workflow form — [spec](features/v1/workflow-edit.md)
- [x] DB cascade deletes (Flyway V3)

### v0.6 — Integrations & Observability
- [x] **Prometheus metrics** — `workflow_transitions_total` counter via Micrometer — [spec](features/v1/observability-and-webhooks.md)
- [x] **Structured JSON logging** — Logstash Logback Encoder with MDC enrichment — [spec](features/v1/observability-and-webhooks.md)
- [x] **Grafana** — Docker Compose + Prometheus scrape config — [spec](features/v1/observability-and-webhooks.md)
- [x] **Webhook callbacks** — per-execution callback URL, async dispatch — [spec](features/v1/observability-and-webhooks.md)
- [x] **Execution context** — optional JSON metadata on execution start — [spec](features/v1/execution-context.md)
- [x] **API key authentication** — `X-API-Key` header filter — [spec](features/v1/api-key-auth.md)

### v1 release checklist
- [x] Backend: 22 test classes, 80+ test methods
- [x] Frontend: 28 spec files across library + shell
- [x] Testcontainers integration test (real PostgreSQL)
- [x] End-to-end HTTP lifecycle test
- [x] Flyway migrations (V1–V5)
- [x] Docker Compose (PostgreSQL + Prometheus + Grafana)
- [x] OpenAPI docs at `/swagger-ui.html`
- [x] Architecture Decision Records (ADR-0001)
- [x] Domain glossary (CONTEXT.md)
- [x] Feature specs for all v1 features

---

## 🚀 v2 — Planned (future enhancements)

| Feature | Spec | Priority |
|---------|------|----------|
| Transition guards (conditional logic) | [spec](features/v2/transition-guards.md) | High |
| State timeouts / SLAs | [spec](features/v2/state-timeouts-slas.md) | High |
| Retry policies for transitions | [spec](features/v2/retry-policies.md) | Medium |
| WebSocket real-time updates | [spec](features/v2/websocket-realtime.md) | Medium |
| Visual workflow graph (UI) | [spec](features/v2/visual-workflow-graph.md) | Medium |
| Workflow versioning | [spec](features/v2/workflow-versioning.md) | Low |
| Role-based transitions | [spec](features/v2/role-based-transitions.md) | Low |
| Parallel states | [spec](features/v2/parallel-states.md) | Low |
| Event sourcing | — | Low |

### Infrastructure & Polish
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] E2E tests with Playwright
- [ ] npm package publishing for Angular library
- [ ] Webhook retry logic
- [ ] Webhook HMAC signature verification
- [ ] Grafana dashboard provisioning
- [ ] Kubernetes deployment manifests
- [ ] Multi-tenancy support

---

## Legend

- ✅ — Delivered in v1
- [ ] — Planned for v2
