import { Component, DestroyRef, inject } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { asyncData } from './async-data.util';

// ---------------------------------------------------------------------------
// Test host — needed only for the DestroyRef test
// ---------------------------------------------------------------------------

@Component({ standalone: true, template: '' })
class DestroyRefHostComponent {
  readonly destroyRef = inject(DestroyRef);
}

// ---------------------------------------------------------------------------
// asyncData
// ---------------------------------------------------------------------------

describe('asyncData', () => {
  // ── Successful emission ─────────────────────────────────────────────────

  it('should emit the value and set loading to false on successful emission', () => {
    const source$ = new Subject<string>();
    const result = asyncData(() => source$.asObservable());

    // Initial state
    expect(result.loading()).toBeTrue();
    expect(result.data()).toBeNull();
    expect(result.error()).toBeNull();

    // Emit a value
    source$.next('hello');

    // After emission
    expect(result.loading()).toBeFalse();
    expect(result.data()).toBe('hello');
    expect(result.error()).toBeNull();
  });

  // ── Error emission ──────────────────────────────────────────────────────

  it('should set error message and loading to false on error', () => {
    const source$ = new Subject<string>();
    const result = asyncData(() => source$.asObservable());

    source$.error(new Error('fail'));

    expect(result.loading()).toBeFalse();
    expect(result.data()).toBeNull();
    expect(result.error()).toBe('An error occurred');
  });

  // ── refresh() ──────────────────────────────────────────────────────────

  it('should reset loading to true on refresh and re-subscribe', () => {
    const source$ = new Subject<string>();
    const result = asyncData(() => source$.asObservable());

    // First emission
    source$.next('first');
    expect(result.loading()).toBeFalse();
    expect(result.data()).toBe('first');
    expect(result.error()).toBeNull();

    // Refresh — resets the lifecycle
    result.refresh();
    expect(result.loading()).toBeTrue();
    expect(result.data()).toBeNull();
    expect(result.error()).toBeNull();

    // Second emission (from the new subscription)
    source$.next('second');
    expect(result.loading()).toBeFalse();
    expect(result.data()).toBe('second');
    expect(result.error()).toBeNull();
  });

  // ── Custom errorMessage ────────────────────────────────────────────────

  it('should use custom errorMessage over the default', () => {
    const source$ = new Subject<string>();
    const result = asyncData(() => source$.asObservable(), {
      errorMessage: 'Custom error message',
    });

    source$.error(new Error('fail'));

    expect(result.error()).toBe('Custom error message');
  });

  // ── onError callback ────────────────────────────────────────────────────

  it('should invoke the onError callback when an error occurs', () => {
    const source$ = new Subject<string>();
    const onError = jasmine.createSpy('onError');
    const result = asyncData(() => source$.asObservable(), { onError });

    const err = new Error('fail');
    source$.error(err);

    expect(onError).toHaveBeenCalledWith(err);
  });

  // ── Subscription leak prevention ────────────────────────────────────────

  it('should not leak subscriptions on multiple sequential refresh calls', () => {
    const subjects = [
      new Subject<string>(),
      new Subject<string>(),
      new Subject<string>(),
    ];
    let index = 0;

    // Each call to factory() returns the next Subject
    const result = asyncData(() => subjects[index++].asObservable());

    // Initial: subscribed to subjects[0]
    // After first refresh: subscribed to subjects[1]
    result.refresh();
    // After second refresh: subscribed to subjects[2]
    result.refresh();

    // Emit on the first-cancelled subscription — should NOT update data
    subjects[0].next('first');
    expect(result.data()).toBeNull();

    // Emit on the second-cancelled subscription — should NOT update data
    subjects[1].next('second');
    expect(result.data()).toBeNull();

    // Emit on the current subscription — SHOULD update data
    subjects[2].next('third');
    expect(result.data()).toBe('third');
    expect(result.loading()).toBeFalse();
  });

  // ── DestroyRef auto-cleanup ─────────────────────────────────────────────

  describe('with DestroyRef', () => {
    let fixture: ComponentFixture<DestroyRefHostComponent>;

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [DestroyRefHostComponent],
      }).compileComponents();

      fixture = TestBed.createComponent(DestroyRefHostComponent);
    });

    it('should unsubscribe when the component is destroyed', () => {
      const source$ = new Subject<string>();
      const destroyRef = fixture.componentInstance.destroyRef;

      const result = asyncData(() => source$.asObservable(), { destroyRef });

      // Normal operation
      source$.next('before-destroy');
      expect(result.data()).toBe('before-destroy');

      // Destroy the component — triggers DestroyRef.onDestroy
      fixture.destroy();

      // After destroy, emitting on the source should NOT update data
      source$.next('after-destroy');
      expect(result.data()).toBe('before-destroy');
    });

    it('should still clean up when refresh() was called before destroy', () => {
      const source$ = new Subject<string>();
      const destroyRef = fixture.componentInstance.destroyRef;

      const result = asyncData(() => source$.asObservable(), { destroyRef });

      source$.next('first');
      expect(result.data()).toBe('first');

      // Refresh — new subscription created
      result.refresh();
      source$.next('second');
      expect(result.data()).toBe('second');

      // Destroy — should clean up the latest subscription
      fixture.destroy();

      source$.next('third');
      expect(result.data()).toBe('second'); // unchanged
    });
  });
});
