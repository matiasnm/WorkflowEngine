import { Component, inject } from '@angular/core';
import { ErrorService } from './error.service';

@Component({
  selector: 'shell-error-toast',
  standalone: true,
  template: `
    <div class="shell-error-toast-container">
      @for (error of errorService.errors(); track error.id) {
        <div class="shell-error-toast" role="alert">
          <span class="shell-error-toast__message">{{ error.message }}</span>
          <button
            class="shell-error-toast__dismiss"
            (click)="errorService.dismissError(error.id)"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .shell-error-toast-container {
      position: fixed;
      top: 16px;
      right: 16px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-width: 400px;
    }

    .shell-error-toast {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 12px 16px;
      background: #d32f2f;
      color: #ffffff;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 0.9rem;
      animation: shell-toast-in 0.2s ease-out;
    }

    @keyframes shell-toast-in {
      from {
        opacity: 0;
        transform: translateX(100%);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }

    .shell-error-toast__message {
      flex: 1;
      line-height: 1.4;
    }

    .shell-error-toast__dismiss {
      flex-shrink: 0;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: none;
      border-radius: 4px;
      background: rgba(255, 255, 255, 0.2);
      color: #ffffff;
      font-size: 0.8rem;
      cursor: pointer;
      padding: 0;
      line-height: 1;
      transition: background 0.15s;
    }

    .shell-error-toast__dismiss:hover {
      background: rgba(255, 255, 255, 0.35);
    }

    .shell-error-toast__dismiss:focus-visible {
      outline: 2px solid #ffffff;
      outline-offset: 2px;
    }
  `],
})
export class ErrorToastComponent {
  readonly errorService = inject(ErrorService);
}
