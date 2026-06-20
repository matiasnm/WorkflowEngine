import { Component, input, Output, EventEmitter, signal, inject, OnInit } from '@angular/core';
import { WorkflowApiService } from '../../services/workflow-api.service';
import { ExecutionApiService } from '../../services/execution-api.service';
import { WorkflowDetail } from '../../models';
import { ExecutionListComponent } from '../execution-list/execution-list.component';

@Component({
  selector: 'we-workflow-detail',
  standalone: true,
  imports: [ExecutionListComponent],
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
        <div class="we-workflow-detail__error" role="alert">
          <span class="we-error-icon" aria-hidden="true">⚠</span>
          <span class="we-error-text">{{ err }}</span>
          <button class="we-btn we-btn--retry" (click)="loadWorkflow()">
            Retry
          </button>
        </div>
      }

      <!-- Success state: workflow detail -->
      @if (!loading() && !error(); as _) {
        @let wf = workflow();
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
          </section>

          <!-- Start Execution button -->
          <div class="we-workflow-detail__actions">
            <button
              class="we-btn we-btn--start"
              [disabled]="startingExecution()"
              (click)="startExecution()"
            >
              @if (startingExecution()) {
                <span class="we-spinner" aria-hidden="true"></span>
                <span>Starting…</span>
              } @else {
                <span>▶ Start Execution</span>
              }
            </button>
            @if (executionError(); as execErr) {
              <div class="we-workflow-detail__exec-error" role="alert">
                <span class="we-error-icon" aria-hidden="true">⚠</span>
                <span class="we-error-text">{{ execErr }}</span>
              </div>
            }
          </div>

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

    .we-btn--back {
      padding: 6px 16px;
      border: 1px solid var(--we-border, #e0e0e0);
      border-radius: var(--we-border-radius, 8px);
      background: var(--we-bg, #ffffff);
      color: var(--we-text, #212121);
      font-size: 0.9rem;
      font-weight: 500;
      cursor: pointer;
      font-family: inherit;
      transition: background 0.15s, border-color 0.15s;
    }

    .we-btn--back:hover {
      background: var(--we-bg-secondary, #f5f5f5);
      border-color: var(--we-primary, #1976d2);
    }

    .we-btn--back:focus-visible {
      outline: 2px solid var(--we-primary, #1976d2);
      outline-offset: 2px;
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

    @keyframes we-shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    /* ── Error state ── */
    .we-workflow-detail__error {
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

    .we-btn--retry {
      padding: 6px 16px;
      border: 1px solid var(--we-danger, #d32f2f);
      border-radius: var(--we-border-radius, 8px);
      background: var(--we-bg, #ffffff);
      color: var(--we-danger, #d32f2f);
      font-size: 0.85rem;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.15s;
    }

    .we-btn--retry:hover {
      background: var(--we-danger, #d32f2f);
      color: #ffffff;
    }

    .we-btn--retry:focus-visible {
      outline: 2px solid var(--we-primary, #1976d2);
      outline-offset: 2px;
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

    .we-btn--start {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 24px;
      border: none;
      border-radius: var(--we-border-radius, 8px);
      background: var(--we-primary, #1976d2);
      color: #ffffff;
      font-size: 0.95rem;
      font-weight: 600;
      cursor: pointer;
      font-family: inherit;
      transition: background 0.15s, opacity 0.15s;
      align-self: flex-start;
    }

    .we-btn--start:hover:not(:disabled) {
      background: var(--we-primary-hover, #1565c0);
    }

    .we-btn--start:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }

    .we-btn--start:focus-visible {
      outline: 2px solid var(--we-primary, #1976d2);
      outline-offset: 2px;
    }

    /* ── Spinner ── */
    .we-spinner {
      display: inline-block;
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: #ffffff;
      border-radius: 50%;
      animation: we-spin 0.6s linear infinite;
    }

    @keyframes we-spin {
      to { transform: rotate(360deg); }
    }

    /* ── Execution error ── */
    .we-workflow-detail__exec-error {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: #fff3f3;
      border: 1px solid var(--we-danger, #d32f2f);
      border-radius: var(--we-border-radius, 8px);
      color: var(--we-danger, #d32f2f);
      font-size: 0.85rem;
    }
  `],
})
export class WorkflowDetailComponent implements OnInit {
  private readonly workflowApi = inject(WorkflowApiService);
  private readonly executionApi = inject(ExecutionApiService);

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

  /** Reactive state */
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly workflow = signal<WorkflowDetail | null>(null);
  readonly startingExecution = signal(false);
  readonly executionError = signal<string | null>(null);

  ngOnInit(): void {
    this.loadWorkflow();
  }

  protected loadWorkflow(): void {
    this.loading.set(true);
    this.error.set(null);

    this.workflowApi.getWorkflow(this.workflowId()).subscribe({
      next: (detail) => {
        this.workflow.set(detail);
        this.loading.set(false);
      },
      error: (err) => {
        const message = err.status === 404
          ? 'Workflow not found.'
          : 'Failed to load workflow.';
        this.error.set(message);
        this.errorEvent.emit(message);
        this.loading.set(false);
      },
    });
  }

  protected onExecutionSelected(executionId: string): void {
    this.executionSelected.emit(executionId);
  }

  protected startExecution(): void {
    this.startingExecution.set(true);
    this.executionError.set(null);

    this.executionApi.startExecution(this.workflowId()).subscribe({
      next: (response) => {
        this.executionCreated.emit(response.executionId);
        this.startingExecution.set(false);
      },
      error: (err) => {
        const message = 'Failed to start execution.';
        this.executionError.set(message);
        this.errorEvent.emit(message);
        this.startingExecution.set(false);
      },
    });
  }

  protected goBack(): void {
    this.back.emit();
  }
}
