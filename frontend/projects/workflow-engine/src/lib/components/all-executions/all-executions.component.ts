import { Component, Input, Output, EventEmitter, inject, DestroyRef } from '@angular/core';
import { DatePipe } from '@angular/common';
import { forkJoin, Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { EXECUTION_API_PORT } from '../../services/execution-api.port';
import { WORKFLOW_API_PORT } from '../../services/workflow-api.port';
import { asyncData } from '../../util';
import { AllExecutionResponse, WorkflowSummary } from '../../models';
import { ErrorBannerComponent } from '../ui';
import { StateColorService } from '../../services/state-color.service';

@Component({
  selector: 'we-all-executions',
  standalone: true,
  imports: [DatePipe, ErrorBannerComponent],
  styleUrl: '../../styles/shared.css',
  template: `
    <div class="we-all-executions">
      <h2 class="we-all-executions__title">Executions</h2>

      @if (executions.loading()) {
        <div class="we-all-executions__skeleton" aria-label="Loading executions">
          @for (_ of [1, 2, 3, 4, 5]; track $index) {
            <div class="we-skeleton-row">
              <div class="we-skeleton-line we-skeleton-line--workflow"></div>
              <div class="we-skeleton-line we-skeleton-line--id"></div>
              <div class="we-skeleton-line we-skeleton-line--state"></div>
              <div class="we-skeleton-line we-skeleton-line--since"></div>
            </div>
          }
        </div>
      }

      @if (executions.error(); as err) {
        <we-error-banner [message]="err" [showRetry]="true" (retry)="executions.refresh()" />
      }

      @if (!executions.loading() && !executions.error() && (executions.data() ?? []).length === 0) {
        <div class="we-all-executions__empty">
          <p>No executions found.</p>
        </div>
      }

      @if (!executions.loading() && !executions.error() && (executions.data() ?? []).length > 0) {
        <div class="we-all-executions__table-wrapper">
          <table class="we-all-executions__table">
            <thead>
              <tr>
                <th>Workflow</th>
                <th>ID</th>
                <th>State</th>
                <th>Since</th>
              </tr>
            </thead>
            <tbody>
              @for (exec of executions.data(); track exec.id) {
                <tr
                  class="we-execution-row"
                  (click)="selectExecution(exec.id)"
                  [attr.aria-label]="'View execution ' + truncateId(exec.id)"
                >
                  <td>{{ exec.workflowName }}</td>
                  <td><code>{{ truncateId(exec.id) }}</code></td>
                  <td>
                    <span class="we-state-swatch" [style.background-color]="getStateColor(exec.workflowId, exec.currentState.code)"></span>
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
    .we-all-executions {
      font-family: var(--we-font-family, system-ui, -apple-system, sans-serif);
    }

    .we-all-executions__title {
      margin: 0 0 16px;
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--we-text, #212121);
    }

    .we-all-executions__skeleton {
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

    .we-skeleton-line--workflow {
      width: 120px;
    }

    .we-skeleton-line--id {
      width: 80px;
    }

    .we-skeleton-line--state {
      width: 140px;
    }

    .we-skeleton-line--since {
      width: 100px;
      margin-left: auto;
    }

    .we-all-executions__empty {
      text-align: center;
      padding: 48px 16px;
      color: var(--we-text-secondary, #757575);
      border: 1px dashed var(--we-border, #e0e0e0);
      border-radius: var(--we-border-radius, 8px);
    }

    .we-all-executions__empty p {
      margin: 0;
      font-size: 0.95rem;
    }

    .we-all-executions__table-wrapper {
      overflow-x: auto;
    }

    .we-all-executions__table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid var(--we-border, #e0e0e0);
      border-radius: var(--we-border-radius, 8px);
      overflow: hidden;
    }

    .we-all-executions__table th,
    .we-all-executions__table td {
      padding: 10px 16px;
      text-align: left;
      font-size: 0.9rem;
    }

    .we-all-executions__table thead {
      background: var(--we-bg-secondary, #f5f5f5);
    }

    .we-all-executions__table th {
      font-weight: 600;
      color: var(--we-text-secondary, #757575);
      text-transform: uppercase;
      font-size: 0.8rem;
      letter-spacing: 0.03em;
    }

    .we-all-executions__table tbody tr {
      border-top: 1px solid var(--we-border, #e0e0e0);
      cursor: pointer;
      transition: background 0.15s;
    }

    .we-all-executions__table tbody tr:hover {
      background: var(--we-bg-secondary, #f5f5f5);
    }

    .we-all-executions__table tbody tr:focus-visible {
      outline: 2px solid var(--we-primary, #1976d2);
      outline-offset: -2px;
    }

    .we-all-executions__table code {
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
export class AllExecutionsComponent {
  private readonly api = inject(EXECUTION_API_PORT);
  private readonly workflowApi = inject(WORKFLOW_API_PORT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly stateColorService = inject(StateColorService);

  /** Backing field for the {@link workflows} input property. */
  private _workflows: WorkflowSummary[] | null = null;

  /**
   * Optional list of workflows to scope the execution fetch to.
   *
   * - When provided (non‑null), executions are fetched per workflow in parallel
   *   via `forkJoin` and merged into a single list.
   * - When `null` (the default / fallback), the component fetches the workflow
   *   list independently first, then performs the same per‑workflow aggregation.
   */
  @Input() set workflows(value: WorkflowSummary[] | null) {
    this._workflows = value;
    // Re‑trigger the async load with the new workflow scope.
    this.executions.refresh();
  }
  get workflows(): WorkflowSummary[] | null {
    return this._workflows;
  }

  @Output() executionSelected = new EventEmitter<string>();
  @Output() errorEvent = new EventEmitter<string>();

  /** Reactive async data for the aggregated execution list. */
  readonly executions = asyncData(
    () => {
      if (this._workflows !== null) {
        return this.aggregateExecutions(this._workflows);
      }
      // Fallback: fetch the workflow list, then aggregate per workflow.
      return this.workflowApi.listWorkflows().pipe(
        switchMap(workflows => this.aggregateExecutions(workflows)),
      );
    },
    {
      errorMessage: 'Failed to load executions.',
      destroyRef: this.destroyRef,
      onError: (err) => this.errorEvent.emit('Failed to load executions.'),
    },
  );

  /**
   * Fetch executions for every workflow in parallel and merge into a single
   * {@link AllExecutionResponse} list, decorating each execution with the
   * workflow name.
   */
  private aggregateExecutions(
    workflows: WorkflowSummary[],
  ): Observable<AllExecutionResponse[]> {
    if (workflows.length === 0) return of([]);

    return forkJoin(
      workflows.map(wf =>
        this.api.listExecutions(wf.id).pipe(
          map(execs =>
            execs.map(e => ({
              id: e.id,
              workflowId: e.workflowId,
              workflowName: wf.name,
              currentState: e.currentState,
              currentStateSince: e.currentStateSince,
            } as AllExecutionResponse)),
          ),
        ),
      ),
    ).pipe(map(results => results.flat()));
  }

  protected selectExecution(id: string): void {
    this.executionSelected.emit(id);
  }

  protected truncateId(id: string): string {
    return id.length > 8 ? id.substring(0, 4) + '…' : id;
  }

  protected getStateColor(workflowId: string, stateCode: string): string | null {
    return this.stateColorService.getColor(workflowId, stateCode);
  }
}
