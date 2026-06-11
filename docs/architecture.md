# Architecture

## System Overview

```
                    HTTP
                      │
                      ▼
┌─────────────────────────────┐
│         REST API            │
│         Controllers         │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│         Use Cases           │
│                             │
│ Commands      Queries       │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│      Domain Services        │
│                             │
│      WorkflowEngine         │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│        Domain Model         │
│                             │
│ Workflow                    │
│ WorkflowExecution           │
│ State                       │
│ Transition                  │
│ StateChanged                │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│     Application Ports       │
│                             │
│ WorkflowRepository          │
│ ExecutionRepository         │
│ StateChangedRepository      │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│ Persistence Adapters (JPA)  │
│                             │
│ JpaWorkflowPersistenceAdapter
│ JpaExecutionPersistenceAdapter
│ JpaStateChangedAdapter
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│ Spring Data Repositories    │
└─────────────────────────────┘
```

---

## Aggregate Boundaries

### Workflow Aggregate

```text
Workflow
 ├── WorkflowId
 ├── States
 ├── Transitions
 └── InitialState
```

### WorkflowExecution Aggregate

```text
WorkflowExecution
 ├── WorkflowExecutionId
 ├── WorkflowId
 ├── CurrentState
 └── History
```

---

## Aggregate Relationship

```text
WorkflowExecution
        │
        │ references
        ▼
Workflow
```

Aggregates are connected only by identifiers.

---

## Workflow Execution Lifecycle

```text
Workflow
    │
    ▼
StartWorkflowExecution
    │
    ▼
WorkflowExecution
    │
    ▼
ExecuteTransition
    │
    ▼
WorkflowEngine
    │
    ▼
StateChanged
    │
    ▼
Persist Event
```

---

## Domain Invariants

* WorkflowEngine is the only component allowed to mutate WorkflowExecution.
* Workflow defines valid transitions.
* WorkflowExecution references Workflow by ID.
* StateChanged is append-only.
* History is reconstructed from persisted events.

---

## Persistence Mapping Rules

### Domain

State is modeled as a Value Object:

```java
State(name, terminal)
```

### Persistence

State is stored as an entity:

```java
StateEntity
```

with a generated UUID.

### Identity Strategy

Domain identity:

```text
WorkflowId
WorkflowExecutionId
```

Persistence identity:

```text
StateEntity.id
TransitionEntity.id
StateChangedEntity.id
```

### State Reconstruction

Because State has no domain identifier, persistence reconstructs domain references using:

```text
State.name
```

through WorkflowContext.

This keeps the domain model immutable and persistence-agnostic.