import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AllExecutionsComponent } from 'workflow-engine';
import { ErrorService } from './error.service';

@Component({
  selector: 'shell-executions-page',
  standalone: true,
  imports: [AllExecutionsComponent],
  template: `
    <div class="shell-executions-page">
      <button class="shell-back-btn" (click)="onBack()">← Back</button>
      <we-all-executions
        (executionSelected)="onExecutionSelected($event)"
        (errorEvent)="onError($event)"
      />
    </div>
  `,
  styles: [`
    .shell-executions-page {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .shell-back-btn {
      align-self: flex-start;
      background: none;
      border: none;
      color: var(--we-primary, #1976d2);
      font-size: 0.9rem;
      font-weight: 500;
      font-family: inherit;
      cursor: pointer;
      padding: 4px 0;
      transition: opacity 0.15s;
    }

    .shell-back-btn:hover {
      opacity: 0.8;
    }
  `],
})
export class ExecutionsPageComponent {
  private readonly router = inject(Router);
  private readonly errorService = inject(ErrorService);

  onBack(): void {
    this.router.navigate(['/']);
  }

  onExecutionSelected(id: string): void {
    this.router.navigate(['/executions', id]);
  }

  onError(message: string): void {
    this.errorService.addError(message);
  }
}
