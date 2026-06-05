# Workflow Engine (Mini Temporal-like System)

A lightweight workflow engine built with Spring Boot and Domain-Driven Design principles.  
It models state machines with executions, transitions, and event history tracking.

---

## 🧠 Architecture Overview

This project follows a simplified Clean Architecture + CQRS approach:
```
application
│
├── usecase
│   │
│   ├── command
│   │   - StartWorkflowExecutionUseCase
│   │   - ExecuteTransitionUseCase
│   │
│   └── query
│       - GetNextStatesUseCase
│       - GetHistoryUseCase
│
└── domain
    │
    ├── event
    │
    ├── model
    │   ├── workflow
    │   │
    │   └── execution
    │ 
    └── service
        - WorkflowEngine
```

---

## ⚙️ Core Concepts

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

## 🔄 CQRS Model

### Commands (write operations)
- StartWorkflowExecution
- ExecuteTransition

### Queries (read operations)
- GetNextStates
- GetHistory

---

## 🚀 Main Capabilities

- Define workflows with states and transitions
- Start executions from a workflow
- Perform validated state transitions
- Track full execution history via events
- Query next possible states
- Inspect execution history

---

## 🧪 Testing Strategy

The system is designed for layered testing:

### 1. Domain Tests (core logic)
- WorkflowEngine transition rules
- State validation
- Event generation

### 2. Application Tests
- Use case orchestration
- Repository interactions (mocked)

### 3. Integration Tests (future)
- Spring Boot + Testcontainers
- PostgreSQL persistence layer

---

## 🧩 Design Principles

- Domain-driven design (DDD)
- Clean Architecture separation
- Reference-by-ID between aggregates
- Engine as pure domain service
- Use cases as system API
- CQRS-light separation of reads and writes

---

## 📌 Example Flow

1. Start workflow execution
2. Query available next states
3. Execute a transition
4. Store event in execution history
5. Query execution history

---

## 🎯 Goal

This project is a **mini workflow runtime engine**, inspired by systems like:
- Temporal
- Camunda
- AWS Step Functions (conceptually)

But implemented in a minimal, educational form for portfolio and system design exploration.

---

## 🛠 Tech Stack

- Java 21
- Spring Boot (optional runtime layer)
- JUnit (testing)
- Future: PostgreSQL + Testcontainers