import { Component, Output, EventEmitter } from '@angular/core';

/**
 * Reusable retry button component.
 * A styled button for retrying failed operations.
 */
@Component({
  selector: 'we-retry-button',
  standalone: true,
  template: `
    <button class="we-btn we-btn--retry" (click)="retry.emit()">
      Retry
    </button>
  `,
  styles: [`
    .we-btn--retry {
      padding: 6px 16px;
      border: 1px solid var(--we-danger, #d32f2f);
      border-radius: var(--we-border-radius, 8px);
      background: var(--we-bg, #ffffff);
      color: var(--we-danger, #d32f2f);
      font-size: 0.85rem;
      font-weight: 500;
      cursor: pointer;
      font-family: inherit;
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
  `],
})
export class RetryButtonComponent {
  /** Emitted when the user clicks the retry button. */
  @Output() retry = new EventEmitter<void>();
}
