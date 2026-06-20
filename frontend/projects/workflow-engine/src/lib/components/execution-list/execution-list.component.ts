import { Component, input, Output, EventEmitter, signal, computed, inject, DestroyRef, effect } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ExecutionApiPort, EXECUTION_API_PORT } from '../../services/execution-api.port';
import { asyncData, AsyncDataResult } from '../../util';
import { ExecutionResponse } from '../../models';

@Component({
  selector: 'we-execution-list',
  standalone: true,
  imports: [DatePipe],
  template: `
    <div class="we-execution-list">
      <!-- Loading state: skeleton with 3 shimmer rows -->
      @if (loading()) {
        <div class="we-execution-list__skeleton" aria-label="Loading executions">
          @for (_ of [1, 2, 3]; track $index) {
            <div class="we-skeleton-row">
              <div class="we-skeleton-line we-skeleton-line--id"></div>
              <div class="we-skeleton-line we-skeleton-line--state"></div>
              <div class="we-skeleton-line we-skeleton-line--since"></div>
            </div>
          }
        </div>
      }

      <!-- Error state: inline error message (no retry — parent handles it) -->
      @if (error(); as err) {
        <div class="we-execution-list__error" role="alert">
          <span class="we-error-icon" aria-hidden="true">⚠</span>
          <span class="we-error-text">{{ err }}</span>
        </div>
      }

      <!-- Empty state -->
      @if (!loading() && !error() && (executionsData() ?? []).length === 0) {
        <div class="we-execution-list__empty">
          <p>No executions yet. Start one above.</p>
        </div>
      }

      <!-- Success state: execution table -->
      @if (!loading() && !error() && (executionsData() ?? []).length > 0) {
        <div class="we-execution-list__table-wrapper">
          <table class="we-execution-list__table">
            <thead>
              <tr>
                <th>ID</th>
                <th>State</th>
                <th>Since</th>
              </tr>
            </thead>
            <tbody>
              @for (exec of executionsData(); track exec.id) {
                <tr
                  class="we-execution-row"
                  (click)="selectExecution(exec.id)"
                  [attr.aria-label]="'View execution ' + truncateId(exec.id)"
                >
                  <td><code>{{ truncateId(exec.id) }}</code></td>
                  <td>
                    <span class="we-execution-state">{{ exec.currentState.name }}</span>
                    <span class="we-execution-state-code">({{ exec.currentState.code }})</span>
                  </td>
                  <td>
                    @if (exec.currentStateSince) {
                      {{ exec.currentStateSince | date:'short' }}
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `,
  styles: [`
    .we-execution-list {
      font-family: var(--we-font-family, system-ui, -apple-system, sans-serif);
    }

    /* ── Skeleton / Shimmer ── */
    .we-execution-list__skeleton {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .we-skeleton-row {
      display: flex;
      gap: 16px;
      padding: 12px 16px;
      background: var(--we-bg, #ffffff);
      border: 1px solid var(--we-border, #e0e0e0);
      border-radius: var(--we-border-radius, 8px);
    }

    .we-skeleton-line {
      height: 14px;
      border-radius: 4px;
      background: linear-gradient(
        90deg,
        var(--we-bg-secondary, #f5f5f5) 25%,
        #e8e8e8 50%,
        var(--we-bg-secondary, #f5f5f5) 75%
      );
      background-size: 200% 100%;
      animation: we-shimmer 1.5s ease-in-out infinite;
    }

    .we-skeleton-line--id {
      width: 80px;
    }

    .we-skeleton-line--state {
      width: 140px;
    }

    .we-skeleton-line--since {
      width: 120px;
      margin-left: auto;
    }

    @keyframes we-shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    /* ── Error state ── */
    .we-execution-list__error {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 16px;
      background: #fff3f3;
      border: 1px solid var(--we-danger, #d32f2f);
      border-radius: var(--we-border-radius, 8px);
      color: var(--we-danger, #d32f2f);
      font-size: 0.9rem;
    }

    .we-error-icon {
      font-size: 1.1rem;
    }

    .we-error-text {
      flex: 1;
    }

    /* ── Empty state ── */
    .we-execution-list__empty {
      text-align: center;
      padding: 32px 16px;
      color: var(--we-text-secondary, #757575);
      border: 1px dashed var(--we-border, #e0e0e0);
      border-radius: var(--we-border-radius, 8px);
    }

    .we-execution-list__empty p {
      margin: 0;
      font-size: 0.9rem;
    }

    /* ── Table ── */
    .we-execution-list__table-wrapper {
      overflow-x: auto;
    }

    .we-execution-list__table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid var(--we-border, #e0e0e0);
      border-radius: var(--we-border-radius, 8px);
      overflow: hidden;
    }

    .we-execution-list__table th,
    .we-execution-list__table td {
      padding: 10px 16px;
      text-align: left;
      font-size: 0.9rem;
    }

    .we-execution-list__table thead {
      background: var(--we-bg-secondary, #f5f5f5);
    }

    .we-execution-list__table th {
      font-weight: 600;
      color: var(--we-text-secondary, #757575);
      text-transform: uppercase;
      font-size: 0.8rem;
      letter-spacing: 0.03em;
    }

    .we-execution-list__table tbody tr {
      border-top: 1px solid var(--we-border, #e0e0e0);
      cursor: pointer;
      transition: background 0.15s;
    }

    .we-execution-list__table tbody tr:hover {
      background: var(--we-bg-secondary, #f5f5f5);
    }

    .we-execution-list__table tbody tr:focus-visible {
      outline: 2px solid var(--we-primary, #1976d2);
      outline-offset: -2px;
    }

    .we-execution-list__table code {
      font-family: var(--we-font-family-mono, 'Cascadia Code', 'Fira Code', 'Consolas', monospace);
      font-size: 0.85rem;
      background: var(--we-bg-secondary, #f5f5f5);
      padding: 2px 6px;
      border-radius: 4px;
    }

    .we-execution-state {
      font-weight: 600;
      color: var(--we-text, #212121);
    }

    .we-execution-state-code {
      color: var(--we-text-secondary, #757575);
      font-size: 0.85rem;
      margin-left: 4px;
    }
  `],
})
export class ExecutionListComponent {
  private readonly api = inject(EXECUTION_API_PORT);
  private readonly destroyRef = inject(DestroyRef);

  /** Required workflow UUID to load executions for. */
  readonly workflowId = input.required<string>();

  /** Emitted when user clicks an execution row. */
  @Output() executionSelected = new EventEmitter<string>();

  /** Emitted on API error, for host app integration. */
  @Output() errorEvent = new EventEmitter<string>();

  /** Lazy-initialised async data (waits for required input to be available). */
  private readonly execsAsync = signal<AsyncDataResult<ExecutionResponse[]> | null>(null);

  /** Top-level loading signal exposed for template access. */
  readonly loading = computed(() => this.execsAsync()?.loading() ?? true);

  /** Top-level error signal exposed for template access. */
  readonly error = computed(() => this.execsAsync()?.error() ?? null);

  /** The resolved execution list, or empty array while loading. */
  readonly executionsData = computed(() => this.execsAsync()?.data() ?? []);

  constructor() {
    effect(() => {
      const id = this.workflowId();
      if (id && !this.execsAsync()) {
        this.execsAsync.set(
          asyncData(
            () => this.api.listExecutions(id),
            {
              errorMessage: 'Failed to load executions.',
              onError: () => this.errorEvent.emit('Failed to load executions.'),
              destroyRef: this.destroyRef,
            },
          ),
        );
      }
    });
  }

  protected selectExecution(id: string): void {
    this.executionSelected.emit(id);
  }

  protected truncateId(id: string): string {
    return id.length > 8 ? id.substring(0, 4) + '…' : id;
  }
}
