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

## 🧠 Architecture Overview

This project follows a simplified Clean Architecture + CQRS approach:
```
workflowEngine
│
├── api
│   ├── controller
│   ├── dto
│   ├── exception
│   └── mapper
│
├── application
│   ├── facade
│   └── usecase
│       ├── commands
│       └── queries
│
├── domain
│   ├── event
│   ├── exception
│   ├── model
│   └── service
│
└── infrastructure
    ├── persistence
    │   ├── adapter
    │   ├── entity
    │   ├── mapper
    │   └── repository
    │
    └── config
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

### 2. Use Case Tests
- Use case orchestration

### 3. Persistance Adapters Tests
- JPA adapters
- Entity mapping
- H2 database integration

### 4. End-To-End Persitance Test
- Workflow persistence
- Execution persistence
- Event persistence
- Aggregate reconstruction

---

## 🧩 Design Principles

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
- Spring Boot 4
- Spring Data JPA
- H2 Database (tests)
- JUnit 5
- Mockito
- Gradle Kotlin DSL

Planned:
- PostgreSQL
- Testcontainers