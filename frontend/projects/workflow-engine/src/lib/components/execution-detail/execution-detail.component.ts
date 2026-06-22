import { Component, input, Output, EventEmitter, signal, computed, inject, ViewChild, DestroyRef, effect } from '@angular/core';
import { DatePipe } from '@angular/common';
import { forkJoin } from 'rxjs';
import { ExecutionApiPort, EXECUTION_API_PORT } from '../../services/execution-api.port';
import { asyncData, AsyncDataResult } from '../../util';
import { ExecutionHistoryComponent } from '../execution-history/execution-history.component';
import { ExecutionResponse, NextStatesResponse, TransitionResponse } from '../../models';
import { ErrorBannerComponent, SpinnerComponent } from '../ui';

@Component({
  selector: 'we-execution-detail',
  standalone: true,
  imports: [DatePipe, ExecutionHistoryComponent, ErrorBannerComponent, SpinnerComponent],
  styleUrl: '../../styles/shared.css',
  template: `
    <div class="we-execution-detail">
      <!-- ── Header: back button + truncated execution ID ── -->
      <div class="we-execution-detail__header">
        <button
          class="we-btn we-btn--back"
          (click)="goBack()"
          aria-label="Back to executions"
        >
          ← Back
        </button>
        <span class="we-execution-detail__id">Execution #{{ truncatedId }}</span>
      </div>

      <!-- ════════════════════════════════════════════
           LOADING STATE: skeleton shimmer
           ════════════════════════════════════════════ -->
      @if (loading()) {
        <div class="we-execution-detail__skeleton" aria-label="Loading execution detail">
          <!-- Current state skeleton card -->
          <div class="we-skeleton-state-card">
            <div class="we-skeleton-line we-skeleton-line--state-code"></div>
            <div class="we-skeleton-line we-skeleton-line--state-since"></div>
          </div>
          <!-- Transition buttons skeleton -->
          <div class="we-skeleton-transitions">
            <div class="we-skeleton-line we-skeleton-line--button"></div>
            <div class="we-skeleton-line we-skeleton-line--button"></div>
          </div>
          <!-- History skeleton -->
          <div class="we-skeleton-history">
            <div class="we-skeleton-line we-skeleton-line--history-title"></div>
            <div class="we-skeleton-timeline-row">
              <div class="we-skeleton-timeline-node"></div>
              <div class="we-skeleton-line we-skeleton-line--history-item"></div>
            </div>
            <div class="we-skeleton-timeline-row">
              <div class="we-skeleton-timeline-node"></div>
              <div class="we-skeleton-line we-skeleton-line--history-item"></div>
            </div>
          </div>
        </div>
      }

      <!-- ════════════════════════════════════════════
           ERROR STATE (initial load failure)
           ════════════════════════════════════════════ -->
      @if (error(); as err) {
        <we-error-banner [message]="err" [showRetry]="true" (retry)="refresh()" />
      }

      <!-- ════════════════════════════════════════════
           SUCCESS STATE
           ════════════════════════════════════════════ -->
      @if (!loading() && !error()) {
        @let exec = execution();
        @if (exec) {

          <!-- ── Terminal state banner ── -->
          @if (exec.currentState.terminal) {
            <div class="we-execution-detail__terminal" role="status">
              <span class="we-terminal-icon" aria-hidden="true">✓</span>
              <span class="we-terminal-text">
                Workflow complete. Final state: <strong>{{ exec.currentState.name }}</strong>
              </span>
            </div>
          }

          <!-- ── Current state display (non-terminal) ── -->
          @if (!exec.currentState.terminal) {
            <div class="we-execution-detail__current-state">
              <div class="we-state-card">
                <div class="we-state-card__code">{{ exec.currentState.code }}</div>
                <div class="we-state-card__name">{{ exec.currentState.name }}</div>
                @if (exec.currentStateSince; as since) {
                  <div class="we-state-card__since">
                    Since {{ since | date:'h:mm a' }}
                  </div>
                }
              </div>
            </div>
          }

          <!-- ── Available Transitions (hidden when terminal) ── -->
          @if (!exec.currentState.terminal) {
            <section class="we-execution-detail__transitions">
              <h3 class="we-section-title">Available Transitions</h3>

              @if (nextStates().length === 0 && !loading()) {
                <p class="we-empty-text">No transitions available.</p>
              }

              <div class="we-transitions-grid">
                @for (state of nextStates(); track state.code) {
                  <button
                    class="we-btn we-btn--transition"
                    [disabled]="transitioning() === state.code"
                    (click)="executeTransition(state.code)"
                    [attr.aria-label]="'Transition to ' + state.name"
                  >
                    @if (transitioning() === state.code) {
                      <we-spinner size="small" color="primary" />
                    }
                    <span class="we-btn__arrow" aria-hidden="true">→</span>
                    <span>{{ state.name }}</span>
                  </button>
                }
              </div>

              <!-- Transition action error -->
              @if (transitionError(); as err) {
                <div class="we-execution-detail__action-error" role="alert">
                  <span class="we-error-icon" aria-hidden="true">⚠</span>
                  <span class="we-error-text">{{ err }}</span>
                </div>
              }
            </section>
          }

          <!-- ── Execution History (always visible when loaded) ── -->
          <section class="we-execution-detail__history">
            <h3 class="we-section-title">History</h3>
            <we-execution-history
              [executionId]="executionId()"
            />
          </section>

        }
      }
    </div>
  `,
  styles: [`
    /* ═══════════════════════════════════════════════════
       ExecutionDetailComponent Styles
       Follows the same design system as sibling components
       ═══════════════════════════════════════════════════ */

    .we-execution-detail {
      font-family: var(--we-font-family, system-ui, -apple-system, sans-serif);
      padding: var(--we-spacing, 16px);
      max-width: 720px;
      margin: 0 auto;
    }

    /* ═══════════════════════════════════════════════════
       HEADER
       ═══════════════════════════════════════════════════ */

    .we-execution-detail__header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: var(--we-spacing, 16px);
    }

    .we-execution-detail__id {
      font-size: 0.95rem;
      font-weight: 600;
      color: var(--we-text-secondary, #757575);
    }

    /* ═══════════════════════════════════════════════════
       SKELETON / LOADING STATE
       ═══════════════════════════════════════════════════ */

    .we-execution-detail__skeleton {
      display: flex;
      flex-direction: column;
      gap: var(--we-spacing, 16px);
    }

    .we-skeleton-state-card {
      padding: 24px;
      border: 1px solid var(--we-border, #e0e0e0);
      border-radius: var(--we-border-radius, 8px);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }

    .we-skeleton-line--state-code {
      width: 120px;
      height: 32px;
    }

    .we-skeleton-line--state-since {
      width: 100px;
      height: 14px;
    }

    .we-skeleton-transitions {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .we-skeleton-line--button {
      width: 200px;
      height: 40px;
      border-radius: 8px;
    }

    .we-skeleton-history {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .we-skeleton-line--history-title {
      width: 80px;
      height: 18px;
    }

    .we-skeleton-timeline-row {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .we-skeleton-timeline-node {
      width: 24px;
      height: 24px;
      min-width: 24px;
      border-radius: 50%;
      background: var(--we-bg-secondary, #f5f5f5);
      animation: we-shimmer 1.5s ease-in-out infinite;
      background-image: linear-gradient(
        90deg,
        var(--we-bg-secondary, #f5f5f5) 25%,
        #e8e8e8 50%,
        var(--we-bg-secondary, #f5f5f5) 75%
      );
      background-size: 200% 100%;
    }

    .we-skeleton-line--history-item {
      flex: 1;
      height: 14px;
    }

    /* ═══════════════════════════════════════════════════
       TERMINAL STATE BANNER
       ═══════════════════════════════════════════════════ */

    .we-execution-detail__terminal {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 20px 24px;
      background: #f1faf1;
      border: 1px solid var(--we-success, #388e3c);
      border-radius: var(--we-border-radius, 8px);
      margin-bottom: var(--we-spacing, 16px);
    }

    .we-terminal-icon {
      font-size: 1.4rem;
      font-weight: 700;
      color: var(--we-success, #388e3c);
    }

    .we-terminal-text {
      font-size: 1rem;
      color: var(--we-text, #212121);
    }

    .we-terminal-text strong {
      font-weight: 600;
    }

    /* ═══════════════════════════════════════════════════
       CURRENT STATE CARD
       ═══════════════════════════════════════════════════ */

    .we-execution-detail__current-state {
      margin-bottom: var(--we-spacing, 16px);
    }

    .we-state-card {
      text-align: center;
      padding: 32px 24px;
      background: var(--we-bg, #ffffff);
      border: 2px solid var(--we-primary, #1976d2);
      border-radius: var(--we-border-radius, 8px);
      position: relative;
      overflow: hidden;
    }

    .we-state-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: var(--we-primary, #1976d2);
    }

    .we-state-card__code {
      font-size: 1.8rem;
      font-weight: 700;
      color: var(--we-primary, #1976d2);
      letter-spacing: 0.02em;
      margin-bottom: 4px;
      text-transform: uppercase;
    }

    .we-state-card__name {
      font-size: 1.1rem;
      font-weight: 500;
      color: var(--we-text, #212121);
      margin-bottom: 4px;
    }

    .we-state-card__since {
      font-size: 0.85rem;
      color: var(--we-text-secondary, #757575);
    }

    /* ═══════════════════════════════════════════════════
       TRANSITIONS SECTION
       ═══════════════════════════════════════════════════ */

    .we-execution-detail__transitions {
      margin-bottom: var(--we-spacing, 16px);
    }

    .we-transitions-grid {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .we-btn--transition {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 20px;
      border: 1px solid var(--we-primary, #1976d2);
      border-radius: var(--we-border-radius, 8px);
      background: var(--we-bg, #ffffff);
      color: var(--we-primary, #1976d2);
      font-size: 0.95rem;
      font-weight: 600;
      cursor: pointer;
      font-family: inherit;
      transition: background 0.15s, color 0.15s, opacity 0.15s;
      align-self: flex-start;
    }

    .we-btn--transition:hover:not(:disabled) {
      background: var(--we-primary, #1976d2);
      color: #ffffff;
    }

    .we-btn--transition:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .we-btn--transition:focus-visible {
      outline: 2px solid var(--we-primary, #1976d2);
      outline-offset: 2px;
    }

    .we-btn__arrow {
      font-size: 1.1rem;
      font-weight: 700;
    }

    /* ═══════════════════════════════════════════════════
       HISTORY SECTION
       ═══════════════════════════════════════════════════ */

    .we-execution-detail__history {
      margin-top: var(--we-spacing, 16px);
    }
  `],
})
export class ExecutionDetailComponent {
  private readonly api = inject(EXECUTION_API_PORT);
  private readonly destroyRef = inject(DestroyRef);

  /** Required execution ID to load detail for. */
  readonly executionId = input.required<string>();

  /** Emitted when a transition is successfully executed. */
  @Output() transitionExecuted = new EventEmitter<TransitionResponse>();

  /** Emitted when the user clicks back. */
  @Output() back = new EventEmitter<void>();

  /** Emitted when an error occurs, so the host app can react (toast, etc.). */
  @Output() errorEvent = new EventEmitter<string>();

  /** Lazy-initialised async data (waits for required input to be available). */
  private readonly execAsync = signal<AsyncDataResult<{ execution: ExecutionResponse; nextStates: NextStatesResponse[] }> | null>(null);

  /** Top-level loading signal exposed for template access. */
  readonly loading = computed(() => this.execAsync()?.loading() ?? true);

  /** Top-level error signal exposed for template access. */
  readonly error = computed(() => this.execAsync()?.error() ?? null);

  /** Individual data signals — synced from execAsync on initial load,
   *  also updated by post-transition refresh (refreshExecutionAndStates). */
  readonly execution = signal<ExecutionResponse | null>(null);
  readonly nextStates = signal<NextStatesResponse[]>([]);
  readonly transitioning = signal<string | null>(null);
  readonly transitionError = signal<string | null>(null);

  /** Reference to the child history component, so we can refresh it after a transition. */
  @ViewChild(ExecutionHistoryComponent) private readonly historyComponent?: ExecutionHistoryComponent;

  /** Derived: truncated execution ID for display ("a1b2...") */
  get truncatedId(): string {
    const id = this.executionId();
    if (!id || id.length <= 8) return id;
    return id.substring(0, 4) + '...';
  }

  constructor() {
    effect(() => {
      const id = this.executionId();
      if (id && !this.execAsync()) {
        this.execAsync.set(
          asyncData(
            () => forkJoin({
              execution: this.api.getExecution(id),
              nextStates: this.api.getNextStates(id),
            }),
            {
              errorMessage: 'Failed to load execution.',
              destroyRef: this.destroyRef,
            },
          ),
        );
      }
    });

    // Sync asyncData emissions into the writable data signals
    effect(() => {
      const data = this.execAsync()?.data();
      if (data) {
        this.execution.set(data.execution);
        this.nextStates.set(data.nextStates);
      }
    });
  }

  /** Retry / refresh. */
  protected refresh(): void {
    this.execAsync()?.refresh();
  }

  protected executeTransition(targetStateCode: string): void {
    this.transitioning.set(targetStateCode);
    this.transitionError.set(null);

    this.api.transition(this.executionId(), targetStateCode).subscribe({
      next: (response) => {
        // Update current state immediately from the response
        this.execution.update((exec) =>
          exec
            ? {
                ...exec,
                currentState: {
                  ...exec.currentState,
                  code: response.currentStateCode,
                  name: response.currentStateName,
                },
              }
            : exec,
        );

        this.transitionExecuted.emit(response);

        // Re-fetch execution + next states for accurate data
        this.refreshExecutionAndStates();

        // Refresh history to include the new StateChanged event
        this.historyComponent?.loadHistory();

        this.transitioning.set(null);
      },
      error: () => {
        const message = 'Failed to execute transition.';
        this.transitionError.set(message);
        this.errorEvent.emit(message);
        this.transitioning.set(null);
      },
    });
  }

  private refreshExecutionAndStates(): void {
    forkJoin({
      execution: this.api.getExecution(this.executionId()),
      nextStates: this.api.getNextStates(this.executionId()),
    }).subscribe({
      next: ({ execution, nextStates }) => {
        this.execution.set(execution);
        this.nextStates.set(nextStates);
      },
      error: () => {
        // Transition succeeded on the server, but refresh failed.
        // Conservatively clear next states to avoid stale transition buttons.
        this.nextStates.set([]);
      },
    });
  }

  protected goBack(): void {
    this.back.emit();
  }
}
