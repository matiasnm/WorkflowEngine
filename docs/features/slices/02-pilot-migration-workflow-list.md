# Slice 2 — Pilot migration: `WorkflowListComponent` → `asyncData`

**Type:** AFK
**Blocked by:** Slice 1 (`asyncData` utility)

## Parent

Derived from opportunity \#1 in `docs/features/frontend-architecture-deepening.md` — "Primitiva reutilizable de carga asíncrona de datos".

## What to build

Migrate `WorkflowListComponent` from its current manual signal pattern to use the new `asyncData()` utility. This is a **pilot** — the first consumption of the utility — to validate the approach before migrating other components.

Current pattern (to replace):
```typescript
readonly loading = signal(true);
readonly error = signal<string | null>(null);
readonly workflows = signal<WorkflowSummary[]>([]);

ngOnInit(): void { this.loadWorkflows(); }

loadWorkflows(): void {
  this.loading.set(true);
  this.error.set(null);
  this.api.listWorkflows().subscribe({
    next: (list) => { this.workflows.set(list); this.loading.set(false); },
    error: (err) => { this.error.set(msg); this.errorEvent.emit(msg); this.loading.set(false); },
  });
}
```

Target pattern:
```typescript
private readonly workflows = asyncData(
  () => this.api.listWorkflows(),
  { errorMessage: 'Failed to load workflows.', onError: (msg) => this.errorEvent.emit(msg as string) },
);
```

Template references change from:
- `loading()` → `workflows.loading()`
- `error()` → `workflows.error()`
- `workflows()` → `workflows.data()`
- `loadWorkflows()` → `workflows.refresh()`

## Acceptance criteria

- [ ] `WorkflowListComponent` uses `asyncData()` — no manual `loading`/`error`/`workflows` signals
- [ ] Template updated: `.loading()`, `.error()`, `.data()` references correct
- [ ] `loadWorkflows()` method removed — retry button calls `.refresh()`
- [ ] `WorkflowListComponent` tests updated to verify the utility is called with the correct factory
- [ ] All existing tests pass
- [ ] Manual verification: workflow list loads, shows skeleton, shows error banner on failure, retry works

## Blocked by

- Slice 1 (`asyncData` utility)
