import { Component, input, Output, EventEmitter, signal, computed, inject, DestroyRef, effect } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ExecutionApiPort, EXECUTION_API_PORT } from '../../services/execution-api.port';
import { asyncData, AsyncDataResult } from '../../util';
import { HistoryItem } from '../../models';
import { ErrorBannerComponent } from '../ui';

@Component({
  selector: 'we-execution-history',
  standalone: true,
  imports: [DatePipe, ErrorBannerComponent],
  styleUrl: '../../styles/shared.css',
  template: `
    <div class="we-execution-history">
      <!-- ── Loading state: skeleton timeline ── -->
      @if (loading()) {
        <div class="we-history-skeleton" aria-label="Loading execution history">
          <div class="we-skeleton-timeline">
            <div class="we-skeleton-timeline__node"></div>
            <div class="we-skeleton-timeline__content">
              <div class="we-skeleton-line we-skeleton-line--title"></div>
            </div>
          </div>
          <div class="we-skeleton-timeline">
            <div class="we-skeleton-timeline__node"></div>
            <div class="we-skeleton-timeline__content">
              <div class="we-skeleton-line we-skeleton-line--title"></div>
              <div class="we-skeleton-line we-skeleton-line--timestamp"></div>
            </div>
          </div>
          <div class="we-skeleton-timeline">
            <div class="we-skeleton-timeline__node"></div>
            <div class="we-skeleton-timeline__content">
              <div class="we-skeleton-line we-skeleton-line--title"></div>
              <div class="we-skeleton-line we-skeleton-line--timestamp"></div>
            </div>
          </div>
          <div class="we-skeleton-timeline">
            <div class="we-skeleton-timeline__node"></div>
            <div class="we-skeleton-timeline__content">
              <div class="we-skeleton-line we-skeleton-line--title"></div>
            </div>
          </div>
        </div>
      }

      <!-- ── Error state: inline error (no retry — parent handles retry) ── -->
      @if (error(); as err) {
        <we-error-banner [message]="err" />
      }

      <!-- ── Empty state ── -->
      @if (!loading() && !error() && (historyData() ?? []).length === 0) {
        <p class="we-history-empty">No history available</p>
      }

      <!-- ── Success states ── -->
      @if (!loading() && !error() && (historyData() ?? []).length > 0; as _) {

        <!-- ══════ VERTICAL MODE ══════ -->
        @if (displayMode() === 'vertical') {
          <div class="we-timeline we-timeline--vertical">
            <!-- Current state at top with ▲ indicator -->
            <div class="we-timeline__current">
              <span class="we-timeline__indicator we-timeline__indicator--current" aria-hidden="true">▲</span>
              <span class="we-timeline__state-name we-timeline__state-name--current">{{ currentState()?.name }}</span>
            </div>

            <div class="we-timeline__connector" aria-hidden="true"></div>

            <!-- History transition items -->
            @for (item of historyData(); track $index; let last = $last) {
              <div class="we-timeline__transition">
                <span class="we-timeline__dot" aria-hidden="true">●</span>
                <div class="we-timeline__transition-body">
                  <span class="we-timeline__from">{{ item.fromStateName }}</span>
                  <span class="we-timeline__arrow we-timeline__arrow--transition" aria-hidden="true">→</span>
                  <span class="we-timeline__to">{{ item.toStateName }}</span>
                  <div class="we-timeline__timestamp">
                    {{ item.timestamp | date:'yyyy-MM-dd h:mm a' }}
                  </div>
                </div>
              </div>

              @if (!last) {
                <div class="we-timeline__connector" aria-hidden="true"></div>
              }
            }

            <!-- Initial state at bottom -->
            <div class="we-timeline__connector" aria-hidden="true"></div>
            <div class="we-timeline__initial">
              <span class="we-timeline__dot" aria-hidden="true">●</span>
              <div class="we-timeline__initial-body">
                <span class="we-timeline__state-name">{{ initialState()?.name }}</span>
                <div class="we-timeline__timestamp">
                  {{ (historyData() ?? [])[0].timestamp | date:'yyyy-MM-dd h:mm a' }}
                </div>
              </div>
            </div>
          </div>
        }

        <!-- ══════ HORIZONTAL MODE ══════ -->
        @if (displayMode() === 'horizontal') {
          <div class="we-timeline we-timeline--horizontal">
            @for (step of horizontalSteps(); track $index; let last = $last) {
              <div
                class="we-timeline__step"
                [class.we-timeline__step--current]="step.isCurrent"
              >
                @if (step.isCurrent) {
                  <span class="we-timeline__dot-indicator" aria-hidden="true">●</span>
                }
                <span
                  class="we-timeline__step-name"
                  [class.we-timeline__step-name--current]="step.isCurrent"
                >
                  {{ step.name }}
                </span>
                <div class="we-timeline__step-label">
                  @if (step.isCurrent) {
                    <span class="we-timeline__current-label">(current)</span>
                  } @else {
                    <span class="we-timeline__step-time">{{ step.timestamp | date:'h:mm a' }}</span>
                  }
                </div>
              </div>

              @if (!last) {
                <span class="we-timeline__arrow we-timeline__arrow--horizontal" aria-hidden="true">→</span>
              }
            }
          </div>
        }

      }
    </div>
  `,
  styles: [`
    /* ═══════════════════════════════════════════════════
       ExecutionHistoryComponent Styles
       Follows the same design system as sibling components
       ═══════════════════════════════════════════════════ */

    .we-execution-history {
      font-family: var(--we-font-family, system-ui, -apple-system, sans-serif);
      padding: var(--we-spacing, 16px);
    }

    /* ═══════════════════════════════════════════════════
       SKELETON / LOADING STATE
       ═══════════════════════════════════════════════════ */

    .we-history-skeleton {
      display: flex;
      flex-direction: column;
      gap: 0;
      max-width: 480px;
    }

    .we-skeleton-timeline {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 12px 0;
    }

    .we-skeleton-timeline__node {
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

    .we-skeleton-timeline__content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding-top: 4px;
    }

    .we-skeleton-line--title {
      width: 65%;
    }

    .we-skeleton-line--timestamp {
      width: 40%;
      height: 12px;
    }

    /* ═══════════════════════════════════════════════════
       EMPTY STATE
       ═══════════════════════════════════════════════════ */

    .we-history-empty {
      text-align: center;
      padding: 32px 16px;
      margin: 0;
      color: var(--we-text-secondary, #757575);
      border: 1px dashed var(--we-border, #e0e0e0);
      border-radius: var(--we-border-radius, 8px);
      font-size: 0.95rem;
    }

    /* ═══════════════════════════════════════════════════
       VERTICAL TIMELINE
       ═══════════════════════════════════════════════════ */

    .we-timeline--vertical {
      display: flex;
      flex-direction: column;
      max-width: 480px;
    }

    /* Connector line between timeline nodes */
    .we-timeline__connector {
      width: 2px;
      height: 28px;
      background: var(--we-border, #e0e0e0);
      margin-left: 11px;  /* centers under 24px node */
    }

    /* ── Current state (▲) ── */
    .we-timeline__current {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .we-timeline__indicator--current {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      font-size: 0.9rem;
      color: var(--we-primary, #1976d2);
      font-weight: 700;
    }

    .we-timeline__state-name--current {
      font-size: 1rem;
      font-weight: 700;
      color: var(--we-primary, #1976d2);
    }

    /* ── Transition items ── */
    .we-timeline__transition {
      display: flex;
      align-items: flex-start;
      gap: 10px;
    }

    .we-timeline__transition-body {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      gap: 6px;
      padding-top: 2px;
    }

    .we-timeline__dot {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      min-width: 24px;
      height: 24px;
      font-size: 0.7rem;
      color: var(--we-text-secondary, #757575);
    }

    .we-timeline__from,
    .we-timeline__to {
      font-size: 0.9rem;
      font-weight: 500;
      color: var(--we-text, #212121);
    }

    .we-timeline__arrow--transition {
      color: var(--we-primary, #1976d2);
      font-weight: 600;
      font-size: 0.9rem;
    }

    .we-timeline__timestamp {
      width: 100%;
      font-size: 0.8rem;
      color: var(--we-text-secondary, #757575);
      margin-top: -2px;
    }

    /* ── Initial state at bottom ── */
    .we-timeline__initial {
      display: flex;
      align-items: flex-start;
      gap: 10px;
    }

    .we-timeline__initial-body {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding-top: 2px;
    }

    .we-timeline__state-name {
      font-size: 0.9rem;
      font-weight: 500;
      color: var(--we-text, #212121);
    }

    /* ═══════════════════════════════════════════════════
       HORIZONTAL TIMELINE
       ═══════════════════════════════════════════════════ */

    .we-timeline--horizontal {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 0;
      padding: 16px 0;
      overflow-x: auto;
    }

    .we-timeline__step {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      min-width: 60px;
      position: relative;
    }

    .we-timeline__step--current {
      /* highlighted current state */
    }

    .we-timeline__dot-indicator {
      font-size: 1rem;
      color: var(--we-primary, #1976d2);
      position: absolute;
      top: -18px;
    }

    .we-timeline__step-name {
      font-size: 0.9rem;
      font-weight: 500;
      color: var(--we-text, #212121);
      padding: 4px 8px;
      border-radius: var(--we-border-radius, 8px);
      white-space: nowrap;
    }

    .we-timeline__step-name--current {
      font-weight: 700;
      color: var(--we-primary, #1976d2);
      background: rgba(25, 118, 210, 0.08);
    }

    .we-timeline__step-label {
      font-size: 0.75rem;
      color: var(--we-text-secondary, #757575);
      text-align: center;
      min-height: 1.2em;
    }

    .we-timeline__current-label {
      font-size: 0.75rem;
      font-style: italic;
      color: var(--we-primary, #1976d2);
    }

    .we-timeline__step-time {
      font-size: 0.75rem;
      color: var(--we-text-secondary, #757575);
    }

    .we-timeline__arrow--horizontal {
      font-size: 1.1rem;
      color: var(--we-primary, #1976d2);
      font-weight: 600;
      margin: 0 6px;
      padding-bottom: 18px; /* aligns with step names */
      user-select: none;
    }
  `],
})
export class ExecutionHistoryComponent {
  private readonly api = inject(EXECUTION_API_PORT);
  private readonly destroyRef = inject(DestroyRef);

  /** Required execution ID to load history for. */
  readonly executionId = input.required<string>();

  /** Display mode: 'vertical' (default) or 'horizontal'. */
  readonly displayMode = input<'vertical' | 'horizontal'>('vertical');

  /** Emitted when an error occurs, so the host app can react (toast, etc.). */
  @Output() errorEvent = new EventEmitter<string>();

  /** Lazy-initialised async data (waits for required input to be available). */
  private readonly historyAsync = signal<AsyncDataResult<HistoryItem[]> | null>(null);

  /** Top-level loading signal exposed for template access. */
  readonly loading = computed(() => this.historyAsync()?.loading() ?? true);

  /** Top-level error signal exposed for template access. */
  readonly error = computed(() => this.historyAsync()?.error() ?? null);

  /** The resolved history data, or null while loading. */
  readonly historyData = computed(() => this.historyAsync()?.data() ?? null);

  /** Derived: current state (toState of the last history item). */
  protected readonly currentState = computed(() => {
    const items = this.historyData();
    if (!items || items.length === 0) return null;
    const last = items[items.length - 1];
    return { code: last.toStateCode, name: last.toStateName };
  });

  /** Derived: initial state (fromState of the first history item). */
  protected readonly initialState = computed(() => {
    const items = this.historyData();
    if (!items || items.length === 0) return null;
    return { code: items[0].fromStateCode, name: items[0].fromStateName };
  });

  /** Derived: flat steps for horizontal mode display. */
  protected readonly horizontalSteps = computed(() => {
    const items = this.historyData();
    if (!items || items.length === 0) return [];

    const steps: Array<{
      name: string;
      code: string;
      timestamp: string;
      isCurrent: boolean;
      isInitial: boolean;
    }> = [];

    // Initial state (fromState of the first item)
    steps.push({
      name: items[0].fromStateName,
      code: items[0].fromStateCode,
      timestamp: items[0].timestamp,
      isCurrent: false,
      isInitial: true,
    });

    // Each transition contributes its toState as a step
    for (let i = 0; i < items.length; i++) {
      const isLast = i === items.length - 1;
      steps.push({
        name: items[i].toStateName,
        code: items[i].toStateCode,
        timestamp: items[i].timestamp,
        isCurrent: isLast,
        isInitial: false,
      });
    }

    return steps;
  });

  constructor() {
    effect(() => {
      const id = this.executionId();
      if (id && !this.historyAsync()) {
        this.historyAsync.set(
          asyncData(
            () => this.api.getHistory(id),
            {
              errorMessage: 'Failed to load execution history.',
              onError: () => this.errorEvent.emit('Failed to load execution history.'),
              destroyRef: this.destroyRef,
            },
          ),
        );
      }
    });
  }

  /** Reloads history from the API. Public so the parent can call it after a transition. */
  loadHistory(): void {
    this.historyAsync()?.refresh();
  }
}
