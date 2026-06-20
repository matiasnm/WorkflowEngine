import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AllExecutionsComponent } from 'workflow-engine';
import { ErrorService } from './error.service';

@Component({
  selector: 'shell-executions-page',
  standalone: true,
  imports: [AllExecutionsComponent],
  template: `
    <we-all-executions
      (executionSelected)="onExecutionSelected($event)"
      (errorEvent)="onError($event)"
    />
  `,
})
export class ExecutionsPageComponent {
  private readonly router = inject(Router);
  private readonly errorService = inject(ErrorService);

  onExecutionSelected(id: string): void {
    this.router.navigate(['/executions', id]);
  }

  onError(message: string): void {
    this.errorService.addError(message);
  }
}
