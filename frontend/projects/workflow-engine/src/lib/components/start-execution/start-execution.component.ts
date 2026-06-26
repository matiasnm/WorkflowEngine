import { Component, Input, Output, EventEmitter, signal, computed, inject } from '@angular/core';
import { JsonPipe, NgTemplateOutlet } from '@angular/common';
import { ExecutionApiPort, EXECUTION_API_PORT } from '../../services/execution-api.port';
import { ErrorBannerComponent, SpinnerComponent } from '../ui';

@Component({
  selector: 'we-start-execution',
  standalone: true,
  imports: [ErrorBannerComponent, SpinnerComponent, JsonPipe, NgTemplateOutlet],
  styleUrl: '../../styles/shared.css',
  template: `
    <div class="we-start-execution">
      <div class="we-start-execution__controls">
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

        <!-- Context toggle (hidden when context is provided programmatically) -->
        @if (context === undefined || context === null) {
          <button
            type="button"
            class="we-btn we-btn--context-toggle"
            (click)="showContextEditor.set(!showContextEditor())"
            [attr.aria-expanded]="showContextEditor()"
            aria-label="Toggle context editor"
          >
            {{ showContextEditor() ? '− Hide Context' : '+ Add Context' }}
          </button>
        }
      </div>

      <!-- Context JSON editor (collapsible) -->
      @if (showContextEditor()) {
        <div class="we-context-editor">
          <label class="we-context-editor__label" for="context-input">
            Context (JSON) — optional metadata attached to this execution
          </label>
          <textarea
            id="context-input"
            class="we-context-editor__textarea"
            [value]="contextJson()"
            (input)="onContextInput($event)"
            placeholder='{ "orderId": "ORD-123", "amount": 4500 }'
            rows="4"
            spellcheck="false"
          ></textarea>
          @if (contextParseError(); as err) {
            <span class="we-context-editor__error">{{ err }}</span>
          }
        </div>
      }

      @if (executionError(); as execErr) {
        <we-error-banner [message]="execErr" />
      }
    </div>
  `,
  styles: [`
    .we-start-execution {
      display: flex;
      flex-direction: column;
      gap: var(--we-spacing-sm, 8px);
    }

    .we-start-execution__controls {
      display: flex;
      align-items: center;
      gap: var(--we-spacing-sm, 8px);
      flex-wrap: wrap;
    }

    .we-btn--start {
      display: inline-flex;
      align-items: center;
      gap: var(--we-spacing-sm, 8px);
      padding: 10px var(--we-spacing-lg, 24px);
      border: none;
      border-radius: var(--we-border-radius, 8px);
      background: var(--we-primary, #1976d2);
      color: #ffffff;
      font-size: var(--we-font-size-md, 0.95rem);
      font-weight: 600;
      cursor: pointer;
      font-family: inherit;
      transition: background var(--we-transition, 0.15s), opacity var(--we-transition, 0.15s);
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

    .we-btn--context-toggle {
      padding: 10px var(--we-spacing, 16px);
      border: 1px solid var(--we-border, #e0e0e0);
      border-radius: var(--we-border-radius, 8px);
      background: var(--we-bg, #ffffff);
      color: var(--we-text-secondary, #757575);
      font-size: var(--we-font-size-sm, 0.85rem);
      font-weight: 500;
      cursor: pointer;
      font-family: inherit;
      transition: border-color var(--we-transition, 0.15s), color var(--we-transition, 0.15s);
    }

    .we-btn--context-toggle:hover {
      border-color: var(--we-primary, #1976d2);
      color: var(--we-primary, #1976d2);
    }

    .we-btn--context-toggle:focus-visible {
      outline: 2px solid var(--we-primary, #1976d2);
      outline-offset: 2px;
    }

    .we-context-editor {
      display: flex;
      flex-direction: column;
      gap: var(--we-spacing-xs, 4px);
    }

    .we-context-editor__label {
      font-size: var(--we-font-size-sm, 0.85rem);
      color: var(--we-text-secondary, #757575);
      font-weight: 500;
    }

    .we-context-editor__textarea {
      width: 100%;
      padding: var(--we-spacing-sm, 8px) var(--we-spacing-md, 12px);
      border: 1px solid var(--we-border, #e0e0e0);
      border-radius: var(--we-border-radius, 8px);
      font-family: var(--we-font-family-mono, 'Cascadia Code', 'Fira Code', 'Consolas', monospace);
      font-size: var(--we-font-size-sm, 0.85rem);
      color: var(--we-text, #212121);
      background: var(--we-bg, #ffffff);
      resize: vertical;
      box-sizing: border-box;
    }

    .we-context-editor__textarea:focus {
      outline: 2px solid var(--we-primary, #1976d2);
      outline-offset: -1px;
      border-color: transparent;
    }

    .we-context-editor__error {
      font-size: var(--we-font-size-sm, 0.85rem);
      color: var(--we-danger, #d32f2f);
    }
  `],
})
export class StartExecutionComponent {
  private readonly executionApi = inject(EXECUTION_API_PORT);

  /** Required workflow ID to start an execution for. */
  @Input({ required: true }) workflowId!: string;

  /**
   * Optional context to attach to the execution.
   * When provided programmatically, the UI editor is hidden.
   * When not provided, the user can optionally enter context via the UI toggle.
   */
  @Input() context?: Record<string, unknown> | null;

  /** Emitted when the execution is successfully created, with the execution UUID. */
  @Output() executionCreated = new EventEmitter<string>();

  /** Emitted when an error occurs, so the host app can react (toast, etc.). */
  @Output() errorEvent = new EventEmitter<string>();

  readonly startingExecution = signal(false);
  readonly executionError = signal<string | null>(null);

  /** Whether the context JSON editor is visible. */
  readonly showContextEditor = signal(false);

  /** Raw JSON string from the editor textarea. */
  readonly contextJson = signal('');

  /** Parse error from the JSON editor, or null if valid. */
  readonly contextParseError = signal<string | null>(null);

  /**
   * Resolved context object — prefers the programmatic @Input(),
   * falls back to the parsed editor value when valid JSON is entered.
   */
  readonly resolvedContext = computed<Record<string, unknown> | null>(() => {
    // Programmatic input takes priority
    if (this.context !== undefined && this.context !== null) {
      return this.context;
    }
    // Editor value
    const json = this.contextJson();
    if (!json || json.trim().length === 0) {
      return null;
    }
    return this.contextParseError() ? null : (JSON.parse(json) as Record<string, unknown>);
  });

  protected onContextInput(event: Event): void {
    const raw = (event.target as HTMLTextAreaElement).value;
    this.contextJson.set(raw);

    if (!raw || raw.trim().length === 0) {
      this.contextParseError.set(null);
      return;
    }
    try {
      JSON.parse(raw);
      this.contextParseError.set(null);
    } catch {
      this.contextParseError.set('Invalid JSON');
    }
  }

  start(): void {
    this.startingExecution.set(true);
    this.executionError.set(null);

    const ctx = this.resolvedContext();
    this.executionApi.startExecution(this.workflowId, ctx ?? undefined).subscribe({
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
