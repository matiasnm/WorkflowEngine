# Architecture

## System overview

```
┌──────────────────────┐
│      Controller      │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│      Use Cases       │
│                      │
│ Commands             │
│ Queries              │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│    WorkflowEngine    │
│   Domain Service     │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│     Domain Model     │
│                      │
│ Workflow             │
│ WorkflowExecution    │
│ State                │
│ Transition           │
└──────────────────────┘
```

## Workflow execution lifecycle

```
Workflow
    │
    │ start
    ▼
WorkflowExecution
    │
    │ transition
    ▼
StateChanged Event
    │
    ▼
History
```

## Aggregate boundaries

```
┌────────────────────┐
│     Workflow       │
├────────────────────┤
│ WorkflowId         │
│ States             │
│ Transitions        │
│ InitialState       │
└────────────────────┘


┌────────────────────┐
│ WorkflowExecution  │
├────────────────────┤
│ ExecutionId        │
│ WorkflowId         │
│ CurrentState       │
│ History            │
└────────────────────┘
```

### Relación

```
WorkflowExecution
        │
        │ reference by id
        ▼
Workflow
```