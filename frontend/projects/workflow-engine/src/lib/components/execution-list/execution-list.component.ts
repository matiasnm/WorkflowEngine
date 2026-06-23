import { Component, input, Output, EventEmitter, signal, computed, inject, DestroyRef, effect } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ExecutionApiPort, EXECUTION_API_PORT } from '../../services/execution-api.port';
import { asyncData, AsyncDataResult } from '../../util';
import { ExecutionResponse } from '../../models';
import { ErrorBannerComponent } from '../ui';
import { StateColorService } from '../../services/state-color.service';

@Component({
  selector: 'we-execution-list',
  standalone: true,
  imports: [DatePipe, ErrorBannerComponent],
  styleUrl: '../../styles/shared.css',
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
        <we-error-banner [message]="err" />
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
                    <span class="we-state-swatch" [style.background-color]="getStateColor(exec.currentState.code)"></span>
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
      gap: var(--we-spacing-sm, 8px);
    }

    .we-skeleton-row {
      display: flex;
      gap: var(--we-spacing, 16px);
      padding: var(--we-spacing-md, 12px) var(--we-spacing, 16px);
      background: var(--we-bg, #ffffff);
      border: 1px solid var(--we-border, #e0e0e0);
      border-radius: var(--we-border-radius, 8px);
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

    /* ── Empty state ── */
    .we-execution-list__empty {
      text-align: center;
      padding: var(--we-spacing-xl, 32px) var(--we-spacing, 16px);
      color: var(--we-text-secondary, #757575);
      border: 1px dashed var(--we-border, #e0e0e0);
      border-radius: var(--we-border-radius, 8px);
    }

    .we-execution-list__empty p {
      margin: 0;
      font-size: var(--we-font-size-base, 0.9rem);
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
      padding: 10px var(--we-spacing, 16px);
      text-align: left;
      font-size: var(--we-font-size-base, 0.9rem);
    }

    .we-execution-list__table thead {
      background: var(--we-bg-secondary, #f5f5f5);
    }

    .we-execution-list__table th {
      font-weight: 600;
      color: var(--we-text-secondary, #757575);
      text-transform: uppercase;
      font-size: var(--we-font-size-sm, 0.85rem);
      letter-spacing: 0.03em;
    }

    .we-execution-list__table tbody tr {
      border-top: 1px solid var(--we-border, #e0e0e0);
      cursor: pointer;
      transition: background var(--we-transition, 0.15s);
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
      font-size: var(--we-font-size-sm, 0.85rem);
      background: var(--we-bg-secondary, #f5f5f5);
      padding: 2px 6px;
      border-radius: var(--we-border-radius-sm, 4px);
    }

    .we-execution-state {
      font-weight: 600;
      color: var(--we-text, #212121);
    }

    .we-execution-state-code {
      color: var(--we-text-secondary, #757575);
      font-size: var(--we-font-size-sm, 0.85rem);
      margin-left: var(--we-spacing-xs, 4px);
    }
  `],
})
export class ExecutionListComponent {
  private readonly api = inject(EXECUTION_API_PORT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly stateColorService = inject(StateColorService);

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

  protected getStateColor(stateCode: string): string | null {
    return this.stateColorService.getColor(this.workflowId(), stateCode);
  }
}
