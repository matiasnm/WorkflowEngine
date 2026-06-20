import { DestroyRef, Signal, signal } from '@angular/core';
import { Observable, Subscription } from 'rxjs';

/**
 * Configuration options for {@link asyncData}.
 */
export interface AsyncDataOptions {
  /**
   * Custom error message displayed when the Observable errors.
   * Defaults to `'An error occurred'`.
   */
  errorMessage?: string;

  /**
   * Callback invoked with the raw error when an error occurs.
   * Useful for host-app integration (e.g. emitting `errorEvent`).
   */
  onError?: (err: unknown) => void;

  /**
   * Optional {@link DestroyRef} for automatic subscription cleanup.
   * Pass the component's `DestroyRef` (obtained via `inject(DestroyRef)`)
   * to have the subscription torn down when the component is destroyed.
   */
  destroyRef?: DestroyRef;
}

/**
 * Reactive async-data result returned by {@link asyncData}.
 */
export interface AsyncDataResult<T> {
  /** The current data value, or `null` before the first emission. */
  readonly data: Signal<T | null>;

  /** `true` while the Observable has not emitted or errored yet. */
  readonly loading: Signal<boolean>;

  /** Error message string on failure, or `null` when no error. */
  readonly error: Signal<string | null>;

  /**
   * Re-subscribes to the factory Observable.
   * Resets `loading` to `true`, clears `data` and `error`,
   * then starts a new subscription. The previous subscription is cancelled.
   */
  readonly refresh: () => void;
}

/**
 * Creates reactive signals that track the lifecycle of an async Observable.
 *
 * Encapsulates the duplicated `loading` / `error` / `data` signal pattern
 * currently repeated across components.
 *
 * @example
 * ```typescript
 * private readonly destroyRef = inject(DestroyRef);
 * readonly workflows = asyncData(
 *   () => this.api.listWorkflows(),
 *   { destroyRef: this.destroyRef, errorMessage: 'Failed to load workflows.' },
 * );
 * // template: @if (workflows.loading()) { ... }
 * ```
 *
 * @param factory - A zero-argument function that returns the Observable to subscribe to.
 * @param options - Optional configuration (error message, error callback, destroy ref).
 * @returns An object with reactive `data`, `loading`, `error` signals and a `refresh` method.
 */
export function asyncData<T>(
  factory: () => Observable<T>,
  options?: AsyncDataOptions,
): AsyncDataResult<T> {
  const data = signal<T | null>(null);
  const loading = signal<boolean>(true);
  const error = signal<string | null>(null);

  let subscription: Subscription | null = null;

  /** Shared start logic — called on init and on every `refresh()`. */
  function start(): void {
    // Cancel any previous subscription
    subscription?.unsubscribe();

    // Reset lifecycle signals
    loading.set(true);
    error.set(null);
    data.set(null);

    // Subscribe to the factory Observable
    subscription = factory().subscribe({
      next: (value) => {
        data.set(value);
        loading.set(false);
      },
      error: (err) => {
        const message = options?.errorMessage ?? 'An error occurred';
        error.set(message);
        loading.set(false);
        options?.onError?.(err);
      },
    });
  }

  // Register automatic cleanup when a DestroyRef is provided
  if (options?.destroyRef) {
    options.destroyRef.onDestroy(() => {
      subscription?.unsubscribe();
    });
  }

  // Begin the async lifecycle immediately
  start();

  return {
    data: data.asReadonly(),
    loading: loading.asReadonly(),
    error: error.asReadonly(),
    refresh: start,
  };
}
