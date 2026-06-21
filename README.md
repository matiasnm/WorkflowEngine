# Workflow Engine (Mini Temporal-like System)
![Java](https://img.shields.io/badge/Java-21-blue)
![Spring Boot](https://img.shields.io/badge/Spring_Boot-4.0.6-green)
![Architecture](https://img.shields.io/badge/Architecture-Hexagonal-orange)
![DDD](https://img.shields.io/badge/DDD-Aggregates-purple)
![CQRS](https://img.shields.io/badge/CQRS-Light-red)
![Build Tool](https://img.shields.io/badge/Gradle-Kotlin_DSL-darkgreen)
![Angular](https://img.shields.io/badge/Angular-19-red)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/matiasnm/WorkflowEngine)

A lightweight workflow runtime engine inspired by Temporal and Camunda, built using Domain-Driven Design (DDD), Hexagonal Architecture and CQRS principles.

> Educational and portfolio project focused on workflow orchestration, state machines and clean architecture.

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

- Define workflows with states and transitions
- Start executions from a workflow
- Perform validated state transitions
- Track full execution history via events
- Query next possible states
- Inspect execution history
- **Paginated execution list** (`?page=0&size=20`)
- **Domain event publishing** via `EventPublisher` hexagonal port + Spring Events adapter
- **OpenAPI / Swagger UI** auto-generated docs at `/swagger-ui.html`
- **Create workflow form** — define states, transitions, and initial state via UI
- **Search/filter workflows** — client-side filtering by name
- **Skeleton loading states** — shimmer placeholders during async data fetch
- **Global error toast** — shell-level error notifications with auto-dismiss

---

## Running the Project

### Prerequisites
- Java 21+
- Docker Desktop (for PostgreSQL via Testcontainers or local dev)
- Node.js 20+ and npm (for Angular frontend)

### Profiles

| Profile | Database | Persistence adapter | Event adapter | Use case |
|---------|----------|---------------------|---------------|---------|
| `dev-jpa` (default) | H2 (embedded, in-memory) | JPA (Spring Data) | Spring `ApplicationEventPublisher` | Fast unit tests, dev without Docker |
| `dev-pg` | PostgreSQL 16 (Docker) | JPA (Spring Data) | Spring `ApplicationEventPublisher` | Local dev matching production |
| `dev-memory` | None | In-memory HashMap | Logging | Controller/service tests without database |

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
Tests use H2 by default (profile `dev-jpa`). The Testcontainers integration test (`WorkflowEnginePgIntegrationTest`) requires Docker Desktop running.

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

The system is designed for layered testing:

### 1. Domain Tests (core logic)
- WorkflowEngine transition rules
- State validation
- Event generation

### 2. Use Case Tests
- Use case orchestration
- Mocked repositories

### 3. Persistence Adapter Tests
- JPA adapters (via @DataJpaTest + H2)
- Flyway migrations validated in PostgreSQL profile

### 4. End-To-End Test
- Full HTTP lifecycle (create workflow → start execution → transition → query history)

### 5. PostgreSQL Integration Test
- Testcontainers-based, validates persistence against real PostgreSQL

---

## Design Principles

### Backend (Java/Spring)
- Domain-driven design (DDD)
- Clean Architecture / Hexagonal Architecture
- Reference-by-ID between aggregates
- Engine as pure domain service
- Use cases as system API
- CQRS-light separation of reads and writes
- Domain model independent from persistence
- State modeled as Value Object with stable `code` identity
- Persistence identity isolated in JPA entities
- Schema managed by Flyway migrations (PostgreSQL), Hibernate DDL for H2 tests

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
1. Create workflow definition (POST /workflows)
2. List available workflows (GET /workflows)
3. Start workflow execution (POST /workflows/{id}/executions)
4. Query available next states (GET /executions/{id}/next-states)
5. Execute a transition (POST /executions/{id}/transition)
6. Query execution history (GET /executions/{id}/history)

### Via UI (frontend)
1. Open `http://localhost:4200` — see workflow list with skeleton loading, then cards
2. Search/filter workflows by name using the search input
3. Click **"+ New Workflow"** — fill form with states, transitions, initial state
4. Click a workflow card — see states table + transitions list
5. Click **"Start Execution"** — navigates to execution view
6. See current state displayed prominently with available transitions
7. Click a transition button — state updates + timeline refreshes
8. Reach terminal state — see completion message

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
| **Backend** | Java 21 + Spring Boot 4 |
| **Persistence** | Spring Data JPA, PostgreSQL 16, Flyway, H2 (tests) |
| **Backend Testing** | JUnit 5, Mockito, Testcontainers |
| **API Documentation** | springdoc-openapi (Swagger UI) |
| **Build** | Gradle Kotlin DSL |
| **Frontend** | Angular 19, TypeScript 5.7, RxJS 7 |
| **Frontend Testing** | Jasmine, Karma, HttpClientTestingController |
| **UI Design** | CSS Custom Properties (`--we-*` system), standalone components |
