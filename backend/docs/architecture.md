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
│                             │
└──────────────┬──────────────┘
                │
                ▼
┌─────────────────────────────┐
│ Persistence Adapters (JPA)  │
│                             │
│ JpaWorkflowPersistenceAdapter
│ JpaExecutionPersistenceAdapter
│   (includes event cascade)  │
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

* WorkflowEngine is the sole mutator of WorkflowExecution — enforced by the Immutable Aggregate pattern (setters removed, transitions return new instances).
* Workflow defines valid transitions.
* WorkflowExecution references Workflow by ID.
* StateChanged is append-only.
* History is reconstructed from persisted events.

---

## Immutable Aggregate Pattern
`WorkflowExecution` follows the **Immutable Aggregate** pattern:
> *"The immutable domain model applies value-object-like behavior to entities and aggregates. Rather than change the state of an existing object, a new instance is created that reflects the new state. The identity is preserved, and the repository ORM maps that identity to the existing database row via merge/update."*
> — Vaughn Vernon, *Implementing Domain-Driven Design*

### How it works

```
transition(target)
       │
       ▼
WorkflowExecution (original)          DB row (id = abc-123)
       │                                      │
       │  creates new instance                │
       ▼                                      │
WorkflowExecution (new, same id)  ──── save() ──► UPDATE same row
       │
       ├── currentState = target
       └── history = old history + new event
```

- **Identity** (`WorkflowExecutionId`) stays the same across transitions — this is what binds the object to its database row.
- **Java object reference** changes on each transition — this is what enforces invariants at compile time.
- **Persistence** is unaffected: `save()` with the same UUID primary key produces an `UPDATE`, not an `INSERT`.

### Rationale
| Concern | Before (mutable) | After (immutable) |
|---|---|---|
| Invariant enforcement | By convention | By type system |
| `setCurrentState()` callable from | Any package | Nowhere (removed) |
| State mutation lives in | `WorkflowEngine` (by convention) | `WorkflowEngine` (only place that can produce a new instance) |
| Testing | Must test every use case | Test only `WorkflowEngine` |

---

## Persistence Mapping Rules

### Domain

State is modeled as a Value Object with a stable identity:

```java
State(code, name, terminal)
```

- **`code`** is an immutable, set-once identifier (e.g. `"created"`, `"in_review"`).  
  It is the stable key that execution entities use to reference a state.
- **`name`** is a mutable display label (e.g. `"CREATED"`, `"IN REVIEW"`).  
  It can change without affecting referential integrity.

### Persistence

State is stored as an entity:

```java
StateEntity
```

with:
- a generated UUID primary key (`id`)
- a `code` column (unique, not null) used as the foreign-key target by execution entities

### Identity Strategy

| Concern | Domain Identity | Persistence Identity |
|---|---|---|
| Workflow | `WorkflowId` | `WorkflowEntity.id` |
| WorkflowExecution | `WorkflowExecutionId` | `WorkflowExecutionEntity.id` |
| State | (none — value object) | `StateEntity.id` (PK), `StateEntity.code` (FK target) |
| Transition | (none — value object) | `TransitionEntity.id` |
| StateChanged | (none — event) | `StateChangedEntity.id` |

### State Reference Strategy (Stable Code)

Execution entities reference states by **`State.code`** (a stable string) rather than by `StateEntity.id` (a generated UUID):

```text
WorkflowExecutionEntity.current_state_code  →  state.code
StateChangedEntity.from_state_code          →  state.code
StateChangedEntity.to_state_code            →  state.code
```

Benefits:
- Codes are human-readable and stable across environments.
- References survive database resets (UUIDs would change).
- The domain model can be serialized/deserialized without a full state lookup.

Downside:
- Renaming a code is expensive (requires updating all references).  
  This is acceptable because codes are designed to be permanent identifiers.

### State Reconstruction

The persistence layer reconstructs domain `State` objects using `StateEntity.code`:

```text
StateEntity.code  ──►  State(code, name, terminal)
```

via `WorkflowContext`, which builds a `Map<String, State>` keyed by code during aggregate load.

This keeps the domain model immutable and persistence-agnostic.