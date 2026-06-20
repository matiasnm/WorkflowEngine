import { Component, Input, Output, EventEmitter, signal, inject } from '@angular/core';
import { ExecutionApiPort, EXECUTION_API_PORT } from '../../services/execution-api.port';
import { ErrorBannerComponent, SpinnerComponent } from '../ui';

@Component({
  selector: 'we-start-execution',
  standalone: true,
  imports: [ErrorBannerComponent, SpinnerComponent],
  styleUrl: '../../styles/shared.css',
  template: `
    <div class="we-start-execution">
      <button
        class="we-btn we-btn--start"
        [disabled]="startingExecution()"
        (click)="start()"
      >
        @if (startingExecution()) {
          <we-spinner />
          <span>Starting…</span>
        } @else {
          <span>▶ Start Execution</span>
        }
      </button>
      @if (executionError(); as execErr) {
        <we-error-banner [message]="execErr" />
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
