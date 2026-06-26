import { Component, input, Output, EventEmitter, signal, computed, inject, ViewChild, DestroyRef, effect } from '@angular/core';
import { DatePipe, JsonPipe } from '@angular/common';
import { forkJoin } from 'rxjs';
import { ExecutionApiPort, EXECUTION_API_PORT } from '../../services/execution-api.port';
import { StateColorService } from '../../services/state-color.service';
import { asyncData, AsyncDataResult } from '../../util';
import { ExecutionHistoryComponent } from '../execution-history/execution-history.component';
import { ExecutionResponse, NextStatesResponse, TransitionResponse } from '../../models';
import { ErrorBannerComponent, SpinnerComponent } from '../ui';

@Component({
  selector: 'we-execution-detail',
  standalone: true,
  imports: [DatePipe, JsonPipe, ExecutionHistoryComponent, ErrorBannerComponent, SpinnerComponent],
  styleUrl: '../../styles/shared.css',
  template: `
    <div class="we-execution-detail">
      <!-- ── Header: back button + truncated execution ID + delete ── -->
      <div class="we-execution-detail__header">
        <button
          class="we-btn we-btn--back"
          (click)="goBack()"
          aria-label="Back to executions"
        >
          ← Back
        </button>
        <span class="we-execution-detail__id">Execution #{{ truncatedId }}</span>
        <button
          class="we-btn we-btn--delete"
          (click)="deleteExecution()"
          aria-label="Delete execution"
        >
          Delete
        </button>
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
              <div class="we-state-card" [style.--we-state-color]="stateColor()">
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

          <!-- ── Context (metadata) key-value table ── -->
          @if (exec.context && contextEntries(exec.context).length > 0) {
            <section class="we-execution-detail__context">
              <h3 class="we-section-title">Context</h3>
              <table class="we-context-table">
                <tbody>
                  @for (entry of contextEntries(exec.context); track entry.key) {
                    <tr class="we-context-row">
                      <td class="we-context-key"><code>{{ entry.key }}</code></td>
                      <td class="we-context-value">
                        @if (isSimpleValue(entry.value)) {
                          {{ entry.value }}
                        } @else {
                          <pre class="we-context-pre">{{ entry.value | json }}</pre>
                        }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </section>
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
              [workflowId]="execution()?.workflowId"
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
      gap: var(--we-spacing-md, 12px);
      margin-bottom: var(--we-spacing, 16px);
    }

    .we-execution-detail__header .we-btn--delete {
      margin-left: auto;
    }

    .we-execution-detail__id {
      font-size: var(--we-font-size-md, 0.95rem);
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
      padding: var(--we-spacing-lg, 24px);
      border: 1px solid var(--we-border, #e0e0e0);
      border-radius: var(--we-border-radius, 8px);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--we-spacing-sm, 8px);
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
      gap: var(--we-spacing-sm, 8px);
    }

    .we-skeleton-line--button {
      width: 200px;
      height: 40px;
      border-radius: var(--we-border-radius, 8px);
    }

    .we-skeleton-history {
      display: flex;
      flex-direction: column;
      gap: var(--we-spacing-md, 12px);
    }

    .we-skeleton-line--history-title {
      width: 80px;
      height: 18px;
    }

    .we-skeleton-timeline-row {
      display: flex;
      align-items: center;
      gap: var(--we-spacing-md, 12px);
    }

    .we-skeleton-timeline-node {
      width: 24px;
      height: 24px;
      min-width: 24px;
      border-radius: 50%;
      background: var(--we-bg-secondary, #f5f5f5);
      animation: we-shimmer var(--we-animation-shimmer, 1.5s) ease-in-out infinite;
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
      padding: 20px var(--we-spacing-lg, 24px);
      background: var(--we-success-bg, #f1faf1);
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
      padding: var(--we-spacing-xl, 32px) var(--we-spacing-lg, 24px);
      background: var(--we-bg, #ffffff);
      border: 2px solid var(--we-state-color, var(--we-primary, #1976d2));
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
      background: var(--we-state-color, var(--we-primary, #1976d2));
    }

    .we-state-card__code {
      font-size: var(--we-font-size-3xl, 1.8rem);
      font-weight: 700;
      color: var(--we-state-color, var(--we-primary, #1976d2));
      letter-spacing: 0.02em;
      margin-bottom: var(--we-spacing-xs, 4px);
      text-transform: uppercase;
    }

    .we-state-card__name {
      font-size: var(--we-font-size-lg, 1.1rem);
      font-weight: 500;
      color: var(--we-text, #212121);
      margin-bottom: var(--we-spacing-xs, 4px);
    }

    .we-state-card__since {
      font-size: var(--we-font-size-sm, 0.85rem);
      color: var(--we-text-secondary, #757575);
    }

    /* ═══════════════════════════════════════════════════
       CONTEXT SECTION
       ═══════════════════════════════════════════════════ */

    .we-execution-detail__context {
      margin-bottom: var(--we-spacing, 16px);
    }

    .we-context-table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid var(--we-border, #e0e0e0);
      border-radius: var(--we-border-radius, 8px);
      overflow: hidden;
    }

    .we-context-row {
      border-bottom: 1px solid var(--we-border, #e0e0e0);
    }

    .we-context-row:last-child {
      border-bottom: none;
    }

    .we-context-key {
      width: 30%;
      padding: 8px var(--we-spacing, 16px);
      vertical-align: top;
      background: var(--we-bg-secondary, #f5f5f5);
    }

    .we-context-key code {
      font-family: var(--we-font-family-mono, 'Cascadia Code', 'Fira Code', 'Consolas', monospace);
      font-size: var(--we-font-size-sm, 0.85rem);
      color: var(--we-text, #212121);
      font-weight: 600;
    }

    .we-context-value {
      padding: 8px var(--we-spacing, 16px);
      font-size: var(--we-font-size-base, 0.9rem);
      color: var(--we-text, #212121);
      word-break: break-word;
    }

    .we-context-pre {
      margin: 0;
      font-family: var(--we-font-family-mono, 'Cascadia Code', 'Fira Code', 'Consolas', monospace);
      font-size: var(--we-font-size-sm, 0.85rem);
      white-space: pre-wrap;
      word-break: break-word;
      background: var(--we-bg-secondary, #f5f5f5);
      padding: var(--we-spacing-sm, 8px);
      border-radius: var(--we-border-radius-sm, 4px);
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
      gap: var(--we-spacing-sm, 8px);
    }

    .we-btn--transition {
      display: inline-flex;
      align-items: center;
      gap: var(--we-spacing-sm, 8px);
      padding: 10px 20px;
      border: 1px solid var(--we-primary, #1976d2);
      border-radius: var(--we-border-radius, 8px);
      background: var(--we-bg, #ffffff);
      color: var(--we-primary, #1976d2);
      font-size: var(--we-font-size-md, 0.95rem);
      font-weight: 600;
      cursor: pointer;
      font-family: inherit;
      transition: background var(--we-transition, 0.15s), color var(--we-transition, 0.15s), opacity var(--we-transition, 0.15s);
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
      font-size: var(--we-font-size-lg, 1.1rem);
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
  private readonly stateColorService = inject(StateColorService);
  private readonly destroyRef = inject(DestroyRef);

  /** Required execution ID to load detail for. */
  readonly executionId = input.required<string>();

  /** Emitted when a transition is successfully executed. */
  @Output() transitionExecuted = new EventEmitter<TransitionResponse>();

  /** Emitted when the execution is successfully deleted. */
  @Output() executionDeleted = new EventEmitter<string>();

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

  /** Auto-generated colour for the current state, or null when not cached. */
  readonly stateColor = computed(() => {
    const exec = this.execution();
    if (!exec) return null;
    return this.stateColorService.getColor(exec.workflowId, exec.currentState.code);
  });
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
              onError: () => this.errorEvent.emit('Failed to load execution.'),
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

  /** Returns sorted context entries for display. */
  protected contextEntries(context: Record<string, unknown>): { key: string; value: unknown }[] {
    return Object.keys(context)
      .sort()
      .map((key) => ({ key, value: context[key] }));
  }

  /** True for simple (renderable inline) value types. */
  protected isSimpleValue(value: unknown): boolean {
    return (
      value === null ||
      value === undefined ||
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    );
  }

  protected goBack(): void {
    this.back.emit();
  }

  protected deleteExecution(): void {
    if (!confirm('Are you sure you want to delete this execution? This action cannot be undone.')) {
      return;
    }
    this.api.deleteExecution(this.executionId()).subscribe({
      next: () => {
        this.executionDeleted.emit(this.executionId());
      },
      error: (err) => {
        const message = err?.error?.detail ?? err?.message ?? 'Failed to delete execution.';
        this.errorEvent.emit(message);
      },
    });
  }
}
