# Workflow Engine (Mini Temporal-like System)
![Java](https://img.shields.io/badge/Java-21-blue)
![Spring Boot](https://img.shields.io/badge/Spring_Boot-4.0.6-green)
![Architecture](https://img.shields.io/badge/Architecture-Hexagonal-orange)
![DDD](https://img.shields.io/badge/DDD-Aggregates-purple)
![CQRS](https://img.shields.io/badge/CQRS-Light-red)
![Build Tool](https://img.shields.io/badge/Gradle-Kotlin_DSL-darkgreen)

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
│   └── infrastructure
│       ├── persistence
│       │   ├── adapter
│       │   ├── entity
│       │   ├── mapper
│       │   └── repository
│       │
│       └── config
│
├── frontend/             ← Angular UI (upcoming)
├── docs/
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

---

## Running the Project

### Prerequisites
- Java 21+
- Docker Desktop (for PostgreSQL via Testcontainers or local dev)

### Profiles

| Profile | Database | Schema | Use case |
|---------|----------|--------|----------|
| `dev-jpa` (default) | H2 (embedded, in-memory) | Hibernate DDL `update` | Fast unit tests, dev without Docker |
| `dev-pg` | PostgreSQL 16 (Docker) | Flyway migrations + Hibernate `validate` | Local dev matching production |
| `dev-memory` | None | None | Controller/service tests with in-memory repos |

### Start PostgreSQL (for dev-pg)

```bash
docker compose up -d
```

### Run the backend

```bash
cd backend
./gradlew bootRun --spring.profiles.active=dev-pg
```

Or from the IDE, set `--spring.profiles.active=dev-pg` in the run configuration.

### Run tests

```bash
cd backend
./gradlew test
```

Tests use H2 by default (profile `dev-jpa`). The Testcontainers integration test (`WorkflowEnginePgIntegrationTest`) requires Docker Desktop running.

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

- Domain-driven design (DDD)
- Clean Architecture separation
- Reference-by-ID between aggregates
- Engine as pure domain service
- Use cases as system API
- CQRS-light separation of reads and writes
- Domain model independent from persistence
- State modeled as Value Object with stable `code` identity
- State references by code (not generated IDs) for stable cross-environment identity
- Persistence identity isolated in JPA entities
- Schema managed by Flyway migrations (PostgreSQL), Hibernate DDL for H2 tests

---

## Example Flow

1. Create workflow definition (POST /workflows)
2. List available workflows (GET /workflows)
3. Start workflow execution (POST /workflows/{id}/executions)
4. Query available next states (GET /executions/{id}/next-states)
5. Execute a transition (POST /executions/{id}/transition)
6. Query execution history (GET /executions/{id}/history)

---

## Goal

This project is a **mini workflow runtime engine**, inspired by systems like:
- Temporal
- Camunda
- AWS Step Functions (conceptually)

But implemented in a minimal, educational form for portfolio and system design exploration.

---

## Tech Stack

- Java 21
- Spring Boot 4
- Spring Data JPA
- PostgreSQL 16 (production + local dev)
- Flyway (schema migrations)
- H2 Database (tests)
- Testcontainers (PostgreSQL integration test)
- JUnit 5 + Mockito
- Gradle Kotlin DSL
- Angular (upcoming)
