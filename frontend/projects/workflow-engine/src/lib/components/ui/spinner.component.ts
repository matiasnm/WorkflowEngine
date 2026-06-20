import { Component, input } from '@angular/core';

/**
 * Reusable spinner component.
 * Displays an animated loading spinner with optional label.
 */
@Component({
  selector: 'we-spinner',
  standalone: true,
  template: `
    <div class="we-spinner__container" role="status">
      <span
        class="we-spinner"
        [class.we-spinner--small]="size() === 'small'"
        [class.we-spinner--primary]="color() === 'primary'"
        aria-hidden="true"
      ></span>
      @if (label(); as lbl) {
        <span class="we-spinner__label">{{ lbl }}</span>
      }
    </div>
  `,
  styles: [`
    .we-spinner__container {
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }

    .we-spinner {
      display: inline-block;
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: #ffffff;
      border-radius: 50%;
      animation: we-spin 0.6s linear infinite;
    }

    .we-spinner--small {
      width: 14px;
      height: 14px;
    }

    .we-spinner--primary {
      border-color: rgba(25, 118, 210, 0.3);
      border-top-color: var(--we-primary, #1976d2);
    }

    .we-spinner__label {
      font-size: 0.9rem;
      color: var(--we-text, #212121);
    }

    @keyframes we-spin {
      to { transform: rotate(360deg); }
    }
  `],
})
export class SpinnerComponent {
  /** Spinner size. */
  readonly size = input<'small' | 'medium'>('medium');

  /** Spinner color scheme. */
  readonly color = input<'default' | 'primary'>('default');

  /** Optional label text shown next to the spinner. */
  readonly label = input<string>('');
}
