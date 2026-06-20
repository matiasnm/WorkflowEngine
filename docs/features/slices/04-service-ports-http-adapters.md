# Slice 4 — Define service ports + refactor HTTP adapters

**Type:** AFK
**Blocked by:** None — can start immediately

## Parent

Derived from opportunity \#2 in `docs/features/frontend-architecture-deepening.md` — "Interfaces de servicio expuestas detrás de un Seam (patrón de dos Adapters)".

## What to build

Introduce abstract port interfaces for the two service axes, making the existing concrete services into explicit HTTP adapters. Wire them through Angular's dependency injection via `InjectionToken` so the seam becomes real (not hypothetical).

### WorkflowApiPort

Create `projects/workflow-engine/src/lib/services/workflow-api.port.ts`:

```typescript
export abstract class WorkflowApiPort {
  abstract listWorkflows(): Observable<WorkflowSummary[]>;
  abstract getWorkflow(id: string): Observable<WorkflowDetail>;
  abstract createWorkflow(request: CreateWorkflowRequest): Observable<{ workflowId: string }>;
}
```

### ExecutionApiPort

Create `projects/workflow-engine/src/lib/services/execution-api.port.ts`:

```typescript
export abstract class ExecutionApiPort {
  abstract startExecution(workflowId: string): Observable<{ executionId: string }>;
  abstract getExecution(id: string): Observable<ExecutionResponse>;
  abstract transition(executionId: string, targetStateCode: string): Observable<TransitionResponse>;
  abstract getNextStates(executionId: string): Observable<NextStatesResponse[]>;
  abstract getHistory(executionId: string): Observable<HistoryItem[]>;
  abstract listExecutions(workflowId: string): Observable<ExecutionResponse[]>;
}
```

### Refactor existing services

- Rename `WorkflowApiService` → `WorkflowApiHttpAdapter` (implements `WorkflowApiPort`)
- Rename `ExecutionApiService` → `ExecutionApiHttpAdapter` (implements `ExecutionApiPort`)

### Update injection

- Add `InjectionToken<WorkflowApiPort>` and `InjectionToken<ExecutionApiPort>`
- Update `provideWorkflowEngine` config to wire the HTTP adapters by default
- Update component constructors to inject via the port tokens instead of concrete classes

### Update barrel exports

- `services/index.ts` exports the ports + HTTP adapters

## Acceptance criteria

- [ ] `WorkflowApiPort` and `ExecutionApiPort` abstract classes created
- [ ] `WorkflowApiHttpAdapter` implements `WorkflowApiPort` (existing implementation preserved)
- [ ] `ExecutionApiHttpAdapter` implements `ExecutionApiPort` (existing implementation preserved)
- [ ] `InjectionToken` constants created and exported
- [ ] `provideWorkflowEngine()` wires the HTTP adapters automatically
- [ ] All 6 components inject via `WorkflowApiPort` / `ExecutionApiPort` tokens
- [ ] All existing tests pass (may need test provider updates)
- [ ] Barrel exports updated
