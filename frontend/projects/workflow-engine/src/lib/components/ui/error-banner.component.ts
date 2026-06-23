import { Component, input, Output, EventEmitter } from '@angular/core';

/**
 * Reusable error banner component.
 * Displays an inline error message with optional retry button.
 */
@Component({
  selector: 'we-error-banner',
  standalone: true,
  template: `
    <div class="we-error-banner" role="alert">
      <span class="we-error-icon" aria-hidden="true">⚠</span>
      <span class="we-error-text">{{ message() }}</span>
      @if (showRetry()) {
        <button class="we-btn we-btn--retry" (click)="retry.emit()">
          Retry
        </button>
      }
    </div>
  `,
  styles: [`
    .we-error-banner {
      display: flex;
      align-items: center;
      gap: var(--we-spacing-sm, 8px);
      padding: var(--we-spacing-md, 12px) var(--we-spacing, 16px);
      background: var(--we-danger-bg, #fff3f3);
      border: 1px solid var(--we-danger, #d32f2f);
      border-radius: var(--we-border-radius, 8px);
      color: var(--we-danger, #d32f2f);
      font-size: var(--we-font-size-base, 0.9rem);
    }

    .we-error-icon {
      font-size: var(--we-font-size-lg, 1.1rem);
      flex-shrink: 0;
    }

    .we-error-text {
      flex: 1;
    }

    .we-btn--retry {
      padding: 6px var(--we-spacing, 16px);
      border: 1px solid var(--we-danger, #d32f2f);
      border-radius: var(--we-border-radius, 8px);
      background: var(--we-bg, #ffffff);
      color: var(--we-danger, #d32f2f);
      font-size: var(--we-font-size-sm, 0.85rem);
      font-weight: 500;
      cursor: pointer;
      font-family: inherit;
      transition: background var(--we-transition, 0.15s);
    }

    .we-btn--retry:hover {
      background: var(--we-danger, #d32f2f);
      color: #ffffff;
    }

    .we-btn--retry:focus-visible {
      outline: 2px solid var(--we-primary, #1976d2);
      outline-offset: 2px;
    }
  `],
})
export class ErrorBannerComponent {
  /** The error message to display. */
  readonly message = input.required<string>();

  /** Whether to show a retry button. */
  readonly showRetry = input<boolean>(false);

  /** Emitted when the user clicks the retry button. */
  @Output() retry = new EventEmitter<void>();
}
