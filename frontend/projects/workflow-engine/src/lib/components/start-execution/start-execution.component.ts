import { Component, Input, Output, EventEmitter, signal, inject } from '@angular/core';
import { ExecutionApiPort, EXECUTION_API_PORT } from '../../services/execution-api.port';

@Component({
  selector: 'we-start-execution',
  standalone: true,
  template: `
    <div class="we-start-execution">
      <button
        class="we-btn we-btn--start"
        [disabled]="startingExecution()"
        (click)="start()"
      >
        @if (startingExecution()) {
          <span class="we-spinner" aria-hidden="true"></span>
          <span>Starting…</span>
        } @else {
          <span>▶ Start Execution</span>
        }
      </button>
      @if (executionError(); as execErr) {
        <div class="we-start-execution__error" role="alert">
          <span class="we-error-icon" aria-hidden="true">⚠</span>
          <span class="we-error-text">{{ execErr }}</span>
        </div>
      }
    </div>
  `,
  styles: [`
    .we-start-execution {
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
    .we-start-execution__error {
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

    .we-error-icon {
      font-size: 1.1rem;
    }

    .we-error-text {
      flex: 1;
    }
  `],
})
export class StartExecutionComponent {
  private readonly executionApi = inject(EXECUTION_API_PORT);

  /** Required workflow ID to start an execution for. */
  @Input({ required: true }) workflowId!: string;

  /** Emitted when the execution is successfully created, with the execution UUID. */
  @Output() executionCreated = new EventEmitter<string>();

  /** Emitted when an error occurs, so the host app can react (toast, etc.). */
  @Output() errorEvent = new EventEmitter<string>();

  readonly startingExecution = signal(false);
  readonly executionError = signal<string | null>(null);

  start(): void {
    this.startingExecution.set(true);
    this.executionError.set(null);

    this.executionApi.startExecution(this.workflowId).subscribe({
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
}
