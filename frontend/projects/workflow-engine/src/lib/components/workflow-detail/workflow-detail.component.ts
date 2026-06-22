import { Component, input, Output, EventEmitter, signal, computed, inject, DestroyRef, effect } from '@angular/core';
import { WorkflowApiPort, WORKFLOW_API_PORT } from '../../services/workflow-api.port';
import { asyncData, AsyncDataResult } from '../../util';
import { WorkflowDetail } from '../../models';
import { ExecutionListComponent } from '../execution-list/execution-list.component';
import { StartExecutionComponent } from '../start-execution/start-execution.component';
import { ErrorBannerComponent } from '../ui';

@Component({
  selector: 'we-workflow-detail',
  standalone: true,
  imports: [ExecutionListComponent, StartExecutionComponent, ErrorBannerComponent],
  styleUrl: '../../styles/shared.css',
  template: `
    <div class="we-workflow-detail">
      <!-- Header with back button -->
      <div class="we-workflow-detail__header">
        <button
          class="we-btn we-btn--back"
          (click)="goBack()"
          aria-label="Back to workflows"
        >
          ← Back
        </button>
      </div>

      <!-- Loading state: full-layout skeleton -->
      @if (loading()) {
        <div class="we-workflow-detail__skeleton" aria-label="Loading workflow detail">
          <div class="we-skeleton-block we-skeleton-block--title"></div>
          <div class="we-skeleton-block we-skeleton-block--table"></div>
          <div class="we-skeleton-block we-skeleton-block--table"></div>
          <div class="we-skeleton-block we-skeleton-block--button"></div>
        </div>
      }

      <!-- Error state: inline error message + retry button -->
      @if (error(); as err) {
        <we-error-banner [message]="err" [showRetry]="true" (retry)="refresh()" />
      }

      <!-- Success state: workflow detail -->
      @if (!loading() && !error(); as _) {
        @let wf = workflowData();
        @if (wf) {
          <h2 class="we-workflow-detail__name">{{ wf.name }}</h2>

          <!-- States table -->
          <section class="we-workflow-detail__section">
            <h3 class="we-workflow-detail__section-title">States</h3>
            <div class="we-table-wrapper">
              <table class="we-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Name</th>
                    <th>Terminal</th>
                  </tr>
                </thead>
                <tbody>
                  @for (state of wf.states; track state.code) {
                    <tr>
                      <td><code>{{ state.code }}</code></td>
                      <td>{{ state.name }}</td>
                      <td>{{ state.terminal ? 'Yes' : 'No' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </section>

          <!-- Transitions list -->
          <section class="we-workflow-detail__section">
            <h3 class="we-workflow-detail__section-title">Transitions</h3>
            <div class="we-transitions-list">
              @for (t of wf.transitions; track $index) {
                <div class="we-transition-item">
                  <span class="we-transition-from">{{ t.from }}</span>
                  <span class="we-transition-arrow">→</span>
                  <span class="we-transition-to">{{ t.to }}</span>
                </div>
              }
              @if (wf.transitions.length === 0) {
                <p class="we-empty-text">No transitions defined.</p>
              }
            </div>

            <!-- Start Execution -->
            <div class="we-workflow-detail__actions">
              <we-start-execution
                [workflowId]="workflowId()"
                (executionCreated)="onExecutionCreated($event)"
                (errorEvent)="errorEvent.emit($event)"
              />
            </div>
          </section>

          <!-- Executions list -->
          <section class="we-workflow-detail__executions">
            <h3 class="we-workflow-detail__section-title">Executions</h3>
            <we-execution-list
              [workflowId]="workflowId()"
              (executionSelected)="onExecutionSelected($event)"
              (errorEvent)="errorEvent.emit($event)"
            />
          </section>
        }
      }
    </div>
  `,
  styles: [`
    .we-workflow-detail {
      font-family: var(--we-font-family, system-ui, -apple-system, sans-serif);
      padding: var(--we-spacing, 16px);
      max-width: 720px;
      margin: 0 auto;
    }

    /* ── Header ── */
    .we-workflow-detail__header {
      margin-bottom: var(--we-spacing, 16px);
    }

    /* ── Skeleton / Shimmer ── */
    .we-workflow-detail__skeleton {
      display: flex;
      flex-direction: column;
      gap: var(--we-spacing, 16px);
    }

    .we-skeleton-block {
      height: 20px;
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

    .we-skeleton-block--title {
      width: 40%;
      height: 28px;
      margin-bottom: 8px;
    }

    .we-skeleton-block--table {
      width: 100%;
      height: 120px;
    }

    .we-skeleton-block--button {
      width: 180px;
      height: 40px;
    }

    /* ── Workflow name ── */
    .we-workflow-detail__name {
      font-size: 1.5rem;
      font-weight: 600;
      color: var(--we-text, #212121);
      margin: 0 0 var(--we-spacing, 16px);
    }

    /* ── Sections ── */
    .we-workflow-detail__section {
      margin-bottom: var(--we-spacing, 16px);
    }

    .we-workflow-detail__section-title {
      font-size: 1.1rem;
      font-weight: 600;
      color: var(--we-text, #212121);
      margin: 0 0 8px;
    }

    /* ── Table ── */
    .we-table-wrapper {
      overflow-x: auto;
    }

    .we-table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid var(--we-border, #e0e0e0);
      border-radius: var(--we-border-radius, 8px);
      overflow: hidden;
    }

    .we-table th,
    .we-table td {
      padding: 10px 16px;
      text-align: left;
      font-size: 0.9rem;
    }

    .we-table thead {
      background: var(--we-bg-secondary, #f5f5f5);
    }

    .we-table th {
      font-weight: 600;
      color: var(--we-text-secondary, #757575);
      text-transform: uppercase;
      font-size: 0.8rem;
      letter-spacing: 0.03em;
    }

    .we-table tbody tr {
      border-top: 1px solid var(--we-border, #e0e0e0);
    }

    .we-table tbody tr:hover {
      background: var(--we-bg-secondary, #f5f5f5);
    }

    .we-table code {
      font-size: 0.85rem;
      background: var(--we-bg-secondary, #f5f5f5);
      padding: 2px 6px;
      border-radius: 4px;
    }

    /* ── Transitions list ── */
    .we-transitions-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .we-transition-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: var(--we-bg, #ffffff);
      border: 1px solid var(--we-border, #e0e0e0);
      border-radius: var(--we-border-radius, 8px);
      font-size: 0.9rem;
    }

    .we-transition-from,
    .we-transition-to {
      font-weight: 500;
      color: var(--we-text, #212121);
    }

    .we-transition-arrow {
      color: var(--we-primary, #1976d2);
      font-weight: 600;
    }

    .we-empty-text {
      color: var(--we-text-secondary, #757575);
      font-size: 0.9rem;
      margin: 0;
    }

    /* ── Actions ── */
    .we-workflow-detail__actions {
      margin-top: var(--we-spacing, 16px);
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
  `],
})
export class WorkflowDetailComponent {
  private readonly workflowApi = inject(WORKFLOW_API_PORT);
  private readonly destroyRef = inject(DestroyRef);

  /** Required workflow ID to load detail for. */
  readonly workflowId = input.required<string>();

  /** Emitted when an execution is successfully created, with the execution UUID. */
  @Output() executionCreated = new EventEmitter<string>();

  /** Emitted when the user clicks an execution in the list. */
  @Output() executionSelected = new EventEmitter<string>();

  /** Emitted when the user clicks back. */
  @Output() back = new EventEmitter<void>();

  /** Emitted when an error occurs, so the host app can react (toast, etc.). */
  @Output() errorEvent = new EventEmitter<string>();

  /** Lazy-initialised async data (waits for required input to be available). */
  private readonly wfAsync = signal<AsyncDataResult<WorkflowDetail> | null>(null);

  /** Top-level loading signal exposed for template access. */
  readonly loading = computed(() => this.wfAsync()?.loading() ?? true);

  /** Top-level error signal exposed for template access. */
  readonly error = computed(() => this.wfAsync()?.error() ?? null);

  /** The resolved workflow detail data, or null while loading. */
  readonly workflowData = computed(() => this.wfAsync()?.data() ?? null);

  constructor() {
    effect(() => {
      const id = this.workflowId();
      if (id && !this.wfAsync()) {
        this.wfAsync.set(
          asyncData(
            () => this.workflowApi.getWorkflow(id),
            {
              errorMessage: 'Failed to load workflow.',
              onError: () => this.errorEvent.emit('Failed to load workflow.'),
              destroyRef: this.destroyRef,
            },
          ),
        );
      }
    });
  }

  /** Retry / refresh. */
  protected refresh(): void {
    this.wfAsync()?.refresh();
  }

  protected onExecutionSelected(executionId: string): void {
    this.executionSelected.emit(executionId);
  }

  protected onExecutionCreated(executionId: string): void {
    this.executionCreated.emit(executionId);
  }

  protected goBack(): void {
    this.back.emit();
  }
}
