# Slice 1 — `asyncData` utility function + unit tests

**Type:** AFK
**Blocked by:** None — can start immediately

## Parent

Derived from opportunity \#1 in `docs/features/frontend-architecture-deepening.md` — "Primitiva reutilizable de carga asíncrona de datos".

## What to build

Create a standalone utility function `asyncData<T>()` in a new `util/` directory at `projects/workflow-engine/src/lib/util/async-data.util.ts`. This function encapsulates the duplicated `loading` / `error` / data signal lifecycle currently repeated across 5+ components.

The function accepts a factory `() => Observable<T>` and optional configuration, and returns an object with reactive signals:

```typescript
function asyncData<T>(
  factory: () => Observable<T>,
  options?: { errorMessage?: string; onError?: (err: unknown) => void }
): {
  data: Signal<T | null>;
  loading: Signal<boolean>;
  error: Signal<string | null>;
  refresh: () => void;
}
```

Key behaviors:
- `loading()` starts as `true`, set to `false` after first emission or error
- `error()` is `null` on success, set to a string message on failure
- `refresh()` re-subscribes to the factory Observable (restarting the lifecycle)
- A single active subscription is maintained (cancels previous on refresh)
- `onError` callback is invoked when an error occurs (for host app integration via `errorEvent`)
- Automatic cleanup using `DestroyRef` or manual teardown

## Acceptance criteria

- [ ] `async-data.util.ts` exists in `src/lib/util/` and exports `asyncData`
- [ ] Unit tests cover:
  - Successful emission: `data()` emits the value, `loading()` transitions `true → false`, `error()` stays `null`
  - Error emission: `error()` has the message, `loading()` transitions `true → false`, `data()` stays `null`
  - `refresh()` re-subscribes and resets `loading` to `true`
  - Custom `errorMessage` overrides the default
  - `onError` callback is invoked on error
  - Multiple sequential `refresh()` calls don't leak subscriptions
  - Component destroy unsubscribes automatically (if using `DestroyRef`)
- [ ] `src/lib/util/index.ts` barrel file created and re-exports `asyncData`
- [ ] All existing tests in the project still pass (no regressions)

## Blocked by

None — can start immediately.
