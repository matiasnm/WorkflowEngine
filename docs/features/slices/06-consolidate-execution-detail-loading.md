# Slice 6 — Consolidate `ExecutionDetailComponent` loading with reactive refresh

**Type:** AFK
**Blocked by:** None — can start immediately

## Parent

Derived from opportunity \#3 in `docs/features/frontend-architecture-deepening.md` — "Consolidar las rutas de carga duplicadas en ExecutionDetailComponent".

## What to build

Eliminate the duplicated `loadExecution()` and `refreshExecutionAndStates()` methods in `ExecutionDetailComponent` by replacing them with a single reactive stream driven by a `refresh$` Subject. Also replace the leaky `@ViewChild(ExecutionHistoryComponent)` coupling with a reactive `history$` stream.

### Current duplication (lines 578–656)

`loadExecution()` and `refreshExecutionAndStates()` are nearly identical — both call `forkJoin({ execution, nextStates })` with the same two API calls. The only difference is:
- `loadExecution`: sets `loading`, `error` signals
- `refreshExecutionAndStates`: silently clears `nextStates` on error

### Target architecture

```typescript
private readonly refresh$ = new Subject<void>();

// Single execution + nextStates stream
readonly executionData$ = this.refresh$.pipe(
  startWith(void 0),
  switchMap(() => forkJoin({
    execution: this.api.getExecution(this.executionId()),
    nextStates: this.api.getNextStates(this.executionId()),
  })),
  shareReplay(1),
);

// History stream auto-refreshes without @ViewChild
readonly history$ = this.refresh$.pipe(
  startWith(void 0),
  switchMap(() => this.api.getHistory(this.executionId())),
  shareReplay(1),
);

refresh(): void {
  this.refresh$.next();
}
```

### What to remove
- `loadExecution()` method (logic replaced by stream initialization)
- `refreshExecutionAndStates()` method (replaced by `refresh()`)
- `@ViewChild(ExecutionHistoryComponent)` decorator + field
- `historyComponent?.loadHistory()` call in `executeTransition()`

### What to update
- Template: if using `async` pipe or `toSignal` for the streams
- Constructor/initialization: start the stream with `startWith(void 0)`
- Loading/error signals: driven by the stream rather than manual

### Optional: Use `asyncData()` from Slice 1
If Slice 1 is complete, the streams can be wrapped with `asyncData()` for loading/error state management. If not, manual signals can be used and later migrated.

## Acceptance criteria

- [ ] `loadExecution()` and `refreshExecutionAndStates()` are removed — single `refresh()` method replaces both
- [ ] `refresh$` Subject drives both execution data and history streams
- [ ] `@ViewChild(ExecutionHistoryComponent)` is removed — no direct child method calls
- [ ] `executeTransition()` calls `this.refresh()` instead of `refreshExecutionAndStates()` and history component methods
- [ ] Loading and error states still work correctly
- [ ] Error on refresh clears `nextStates` (preserving current behavior)
- [ ] All existing tests pass
- [ ] Manual smoke test: load execution detail, execute a transition, verify history updates
