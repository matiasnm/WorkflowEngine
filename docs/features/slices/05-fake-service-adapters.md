# Slice 5 — Create fake service adapters for testing

**Type:** AFK
**Blocked by:** Slice 4 (service ports defined)

## Parent

Derived from opportunity \#2 in `docs/features/frontend-architecture-deepening.md` — "Interfaces de servicio expuestas detrás de un Seam (patrón de dos Adapters)".

## What to build

Create in-memory fake adapters that implement the port interfaces, providing a second adapter implementation to make the seam real. These fakes serve tests, Storybook, and development/demo scenarios without requiring a backend.

### `WorkflowApiFakeAdapter`

Create `projects/workflow-engine/src/lib/services/workflow-api.fake-adapter.ts`:

```typescript
@Injectable()
export class WorkflowApiFakeAdapter implements WorkflowApiPort {
  // In-memory data with sensible defaults
  private workflows: WorkflowSummary[] = [...];
  private details: Map<string, WorkflowDetail> = new Map();

  listWorkflows(): Observable<WorkflowSummary[]> {
    return of(this.workflows);
  }

  getWorkflow(id: string): Observable<WorkflowDetail> {
    const detail = this.details.get(id);
    return detail ? of(detail) : throwError(() => new Error('Not found'));
  }

  createWorkflow(request: CreateWorkflowRequest): Observable<{ workflowId: string }> {
    const id = crypto.randomUUID();
    // Store a new detail entry
    return of({ workflowId: id });
  }
}
```

### `ExecutionApiFakeAdapter`

Create `projects/workflow-engine/src/lib/services/execution-api.fake-adapter.ts` with similar in-memory data.

### Update test providers

- Component tests switch from `HttpTestingController` to providing the fake adapter
- Update test setup in `.spec.ts` files for all 6 components

## Acceptance criteria

- [ ] `WorkflowApiFakeAdapter` implements `WorkflowApiPort` with in-memory data
- [ ] `ExecutionApiFakeAdapter` implements `ExecutionApiPort` with in-memory data
- [ ] Fake adapters use `of()` / `throwError()` from RxJS — no HTTP dependency
- [ ] At least one component test is refactored to use the fake adapter instead of `HttpTestingController`
- [ ] All existing tests still pass (or are updated to match new fake data)
- [ ] `services/index.ts` exports both fake adapters
