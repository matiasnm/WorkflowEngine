# WorkflowEngine

![CI](https://img.shields.io/github/actions/workflow/status/matiasnm/WorkflowEngine/ci.yml?branch=main&label=CI)
[![Release](https://img.shields.io/github/v/release/matiasnm/WorkflowEngine)](https://github.com/matiasnm/WorkflowEngine/releases)
![Java 21](https://img.shields.io/badge/Java-21-blue)
![Spring Boot 4](https://img.shields.io/badge/Spring_Boot-4.0.6-green)
![Angular 19](https://img.shields.io/badge/Angular-19-red)
![TypeScript 5.7](https://img.shields.io/badge/TypeScript-5.7-blue)
![Architecture](https://img.shields.io/badge/Hexagonal-__-purple?label=Hexagonal+%2B+DDD+%2B+CQRS)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue)
![Prometheus](https://img.shields.io/badge/Metrics-Prometheus_+_Grafana-orange)
![License](https://img.shields.io/github/license/matiasnm/WorkflowEngine)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/matiasnm/WorkflowEngine)

A lightweight **workflow orchestration engine** — inspired by [Temporal](https://temporal.io/), [Camunda](https://camunda.com/), and [AWS Step Functions](https://aws.amazon.com/step-functions/) — built with Domain-Driven Design, Hexagonal Architecture, and CQRS principles.

> Educational and portfolio project demonstrating clean architecture patterns, event-driven orchestration, and a full-stack TypeScript + Java implementation.

---

## Project Structure

```
workflowEngine
├── backend/
│   ├── api
│   │   ├── controller
│   │   ├── dto
│   │   ├── exception
│   │   └── mapper
│   │
│   ├── application
│   │   ├── facade
│   │   ├── port
│   │   └── usecase
│   │       ├── commands
│   │       └── queries
│   │
│   ├── domain
│   │   ├── event
│   │   ├── exception
│   │   ├── model
│   │   └── service
│   │
│   ├── docs/                         ← Backend-specific docs
│   │   ├── architecture.md
│   │   ├── database.dbml
│   │   ├── domain-model.puml
│   │   └── schema.sql
│   │
│   └── infrastructure
│       ├── event                      ← EventPublisher adapters (Spring Events, Logging)
│       ├── persistence
│       │   ├── adapter
│       │   ├── entity
│       │   ├── mapper
│       │   └── repository
│       │
│       └── config
│
├── frontend/
│   ├── projects/
│   │   ├── workflow-engine/      ← Reusable Angular library (ng-packagr)
│   │   │   ├── src/lib/
│   │   │   │   ├── models/           ← Domain TypeScript interfaces
│   │   │   │   ├── config/           ← Injection token (provideWorkflowEngine)
│   │   │   │   ├── services/         ← API clients (WorkflowApiService, ExecutionApiService)
│   │   │   │   └── components/       ← Standalone UI components
│   │   │   │       ├── workflow-list/
│   │   │   │       ├── workflow-detail/
│   │   │   │       ├── execution-detail/
│   │   │   │       ├── execution-history/
│   │   │   │       ├── execution-list/
│   │   │   │       └── workflow-create/
│   │   │   └── public-api.ts         ← Barrel exports
│   │   │
│   │   └── shell/                   ← Demo SPA consuming the library
│   │       └── src/app/
│   │           ├── app.config.ts     ← provideWorkflowEngine({ apiBaseUrl: ... })
│   │           ├── app.routes.ts     ← Lazy-loaded routes
│   │           ├── error.service.ts  ← Global error toast state
│   │           ├── error-toast.component.ts ← Toast notification UI
│   │           └── *-page.component  ← Routing page wrappers
│   │
│   ├── angular.json
│   ├── package.json
│   └── docs/                        ← Frontend-specific docs
│       ├── mvp.md                   ← Frontend MVP scope
│       └── architecture-deepening.md ← Architecture improvement roadmap
│
├── docs/                            ← Cross-cutting docs (root level)
│   ├── CONTEXT.md                   ← Domain glossary & architecture decisions
│   ├── mvp.md
│   ├── roadmap.md
│   └── features/                    ← Feature specs (back + front)
├── docker-compose.yml    ← PostgreSQL 16 for local dev
└── ...config files
```

---

## Core Concepts

### Workflow
Defines the **rules of the system**:
- States
- Transitions
- Initial state

### WorkflowExecution
Represents a **running instance** of a workflow:
- Current state
- Execution ID
- History of state changes

### WorkflowEngine
Pure domain service that:
- Validates transitions
- Applies state changes
- Emits domain events

---

## CQRS Model

### Commands (write operations)
- CreateWorkflow
- StartWorkflowExecution
- ExecuteTransition

### Queries (read operations)
- ListWorkflows
- GetWorkflow
- ListExecutions
- GetExecution
- GetNextStates
- GetHistory

---

## Main Capabilities

### Core Engine
- Define workflows with states (code, name, terminal flag) and transitions
- Start executions from a workflow with optional execution context (metadata)
- Perform validated state transitions with domain rule enforcement
- Track full execution history via `StateChanged` domain events
- Query next possible states for any execution
- Immutable aggregate pattern — transitions produce new `WorkflowExecution` instances

### API & Integration
- **Full CQRS REST API** — separate command and query endpoints
- **OpenAPI / Swagger UI** — auto-generated docs at `/swagger-ui.html`
- **Paginated execution list** (`?page=0&size=20`)
- **Workflow CRUD** — create, read, update (with edit-constraint validation), delete (guarded)
- **Execution CRUD** — start, list, get, delete (terminal state only)
- **Pre-flight editability check** (`GET /workflows/{id}/editable`)
- **Domain event publishing** via `EventPublisher` hexagonal port + Spring Events adapter
- **Webhook callbacks** — per-execution callback URL for external system integration
- **API key authentication** via `X-API-Key` header
- **Execution context** — optional JSON metadata on execution start

### Observability
- **Prometheus metrics** — `workflow_transitions_total` counter with `from_state` / `to_state` tags
- **Structured JSON logging** via Logstash Logback Encoder (MDC: `executionId`, `fromState`, `toState`)
- **Grafana dashboards** — Docker Compose configuration included
- **Micrometer + Actuator** — `/actuator/prometheus` endpoint

### Frontend (Angular Library + Shell Demo)
- **Workflow list** with skeleton loading, search/filter, and selection
- **Workflow detail** with states table, transitions list, and Start Execution button
- **Workflow create form** — define states, transitions, and initial state
- **Workflow edit form** — pre-filled with smart edit-constraint validation
- **Execution detail** with current state, available transitions (pessimistic UI), and completion detection
- **Execution history** — vertical/horizontal timeline modes
- **Paginated execution list** per workflow + all-executions aggregation view
- **Start Execution component** — button with loading state, optional context
- **Reusable UI atoms** — skeleton cards, error banners, retry buttons, spinners
- **Global error toast** — auto-dismiss notifications
- **CSS Custom Properties theming** — `--we-*` design system, host app overridable

---

## Running the Project

### Prerequisites
- Java 21+
- Docker Desktop (for PostgreSQL via Testcontainers or local dev)
- Node.js 20+ and npm (for Angular frontend)

### Profiles

| Profile | Database | Persistence | Events | Metrics/Logging | Use case |
|---------|----------|-------------|--------|-----------------|---------|
| `dev-h2` (default) | H2 (embedded) | JPA (Spring Data) | Spring Events | Active | Fast dev, tests without Docker |
| `dev-pg` | PostgreSQL 16 (Docker) | JPA (Spring Data) | Spring Events | Active | Local dev matching production |
| `dev-memory` | None | In-memory HashMap | Logging only | Disabled | Controller/service tests |

### Start PostgreSQL (for dev-pg)

```bash
docker compose up -d
```

### Run the backend

```bash
cd backend
./gradlew bootRun --args='--spring.profiles.active=dev-pg'
```

Or from the IDE, set `--spring.profiles.active=dev-pg` in the run configuration.

### Run the frontend

```bash
cd frontend
npm install
ng serve      # serves the shell demo app at http://localhost:4200
```

### Run tests

#### Backend tests
```bash
cd backend
./gradlew test
```
Tests use H2 by default (profile `dev-h2`). The Testcontainers integration test (`WorkflowEnginePgIntegrationTest`) requires Docker Desktop running.

#### Frontend tests
```bash
cd frontend
ng test       # Karma unit tests (library + shell)
```

Or run tests for a specific project:
```bash
ng test workflow-engine   # library tests only
ng test shell             # shell app tests only
```

---

## Testing Strategy

The system is designed for layered testing with **22 backend test classes** (80+ test methods) and **28 frontend spec files**:

### Backend

| Layer | Framework | Scope |
|-------|-----------|-------|
| **Domain Tests** | JUnit 5 + AssertJ | WorkflowEngine transition rules, state validation, event generation |
| **Use Case Tests** | JUnit 5 + Mockito | Command/query orchestration with mocked repositories |
| **Controller Tests** | `@WebMvcTest` | REST endpoint behaviour, validation, error mapping |
| **Persistence Adapter Tests** | `@DataJpaTest` + H2 | JPA adapter round-trips, Flyway migrations |
| **PostgreSQL Integration** | Testcontainers | Full persistence layer against real PostgreSQL 16 |
| **End-to-End Test** | `@SpringBootTest` + `TestRestTemplate` | Full HTTP lifecycle (create → start → transition → history) |
| **Security Tests** | `@WebMvcTest` + MockMvc | API key authentication filter, permitted paths |

### Frontend

| Layer | Framework | Scope |
|-------|-----------|-------|
| **Service Tests** | `HttpClientTestingController` | HTTP request/response for all API services |
| **Component Tests** | TestBed + mocks | Rendering, loading/empty/error states, interaction |
| **Fake Adapter Tests** | Jasmine | In-memory adapter implementations for offline testing |
| **Model/Util Tests** | Jasmine | Pure function behaviour (state colors, async data util)

---

## Design Principles

### Backend (Java/Spring)
- **Domain-Driven Design (DDD)** — ubiquitous language, aggregates, domain services
- **Hexagonal Architecture** — ports (interfaces) and adapters (JPA, in-memory, REST)
- **CQRS-light** — separate command and query use cases
- **Immutability** — `WorkflowExecution` is immutable; transitions produce new instances
- **Reference-by-ID** — aggregates reference each other only by ID
- **Pure domain service** — `WorkflowEngine` validates and applies transitions with zero infrastructure dependency
- **Event-driven** — `StateChanged` events published via hexagonal `EventPublisher` port
- **Value Objects** — State modeled with stable `code` identity, used as FK target
- **Persistence ignorance** — domain model has no JPA annotations; mappers isolate entities
- **Schema migrations** — Flyway for PostgreSQL, Hibernate DDL auto for H2 tests
- **Pluggable profiles** — `dev-h2`, `dev-pg`, `dev-memory` for different environments

### Frontend (Angular)
- **Library architecture**: reusable `workflow-engine` library + `shell` demo SPA
- **Standalone components**: no NgModules, all components lazy-loadable
- **Autonomous components**: components fetch their own data via API
- **Signals-based state**: loading/error/data managed with `signal()`, `computed()` for derived state
- **Pessimistic updates**: transition buttons show spinner + disable until API responds
- **CSS Custom Properties**: `--we-*` design system, host app overrides via `:root`
- **Skeleton loading**: shimmer-based skeleton placeholders during data fetch for perceived performance
- **Error resilience**: inline error messages + `@Output() errorEvent` for host app integration + global error toast
- **Client-side search**: computed signal for instant client-side filtering of workflow list

---

## Example Flow

### Via API (backend)
1. **Create workflow definition** — `POST /workflows`
2. **List available workflows** — `GET /workflows`
3. **Update existing workflow** (if needed) — `PUT /workflows/{id}`
4. **Check editability** — `GET /workflows/{id}/editable`
5. **Delete workflow** (if no executions) — `DELETE /workflows/{id}`
6. **Start workflow execution** (with optional context + callback URL) — `POST /workflows/{id}/executions`
7. **List executions** (paginated) — `GET /workflows/{id}/executions?page=0&size=20`
8. **Query available next states** — `GET /executions/{id}/next-states`
9. **Execute a transition** — `POST /executions/{id}/transition`
10. **Query execution history** — `GET /executions/{id}/history`
11. **Inspect Prometheus metrics** — `GET /actuator/prometheus`

### Via UI (frontend)
1. Open `http://localhost:4200` — see workflow list with skeleton loading, then cards
2. Search/filter workflows by name using the search input
3. Click **"+ New Workflow"** — fill form with states, transitions, initial state
4. Click a workflow card — see states table + transitions list
5. Click **"Edit"** — pre-filled edit form with smart validation
6. Click **"Start Execution"** (with optional context) — navigates to execution view
7. See current state displayed prominently with available transitions
8. Click a transition button — state updates + timeline refreshes (pessimistic UI)
9. Reach terminal state — see completion message
10. Browse all executions across workflows at `/executions`

### Integration
- **Webhook callbacks** — each execution can receive POST requests on every state change
- **Prometheus + Grafana** — monitor transition counts, rates, and patterns
- **Swagger UI** — interactive API documentation at `http://localhost:8080/swagger-ui.html`

---

## Goal

This project is a **mini workflow runtime engine**, inspired by systems like:
- Temporal
- Camunda
- AWS Step Functions (conceptually)

But implemented in a minimal, educational form for portfolio and system design exploration.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Java 21 + Spring Boot 4.0.6 |
| **Persistence** | Spring Data JPA, PostgreSQL 16, Flyway, H2 (tests) |
| **Backend Testing** | JUnit 5, Mockito, Testcontainers |
| **API Documentation** | springdoc-openapi (Swagger UI) |
| **Observability** | Micrometer, Prometheus, Grafana, Logstash Logback Encoder |
| **Security** | API Key authentication (`X-API-Key` header) |
| **Build** | Gradle Kotlin DSL |
| **Frontend** | Angular 19.2, TypeScript 5.7, RxJS 7 |
| **Frontend Architecture** | Standalone components, Signals, CSS Custom Properties |
| **Frontend Testing** | Jasmine, Karma, HttpClientTestingController |
| **Infrastructure** | Docker Compose (PostgreSQL + Prometheus + Grafana) |
