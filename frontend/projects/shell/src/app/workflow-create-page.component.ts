import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { WorkflowCreateComponent } from 'workflow-engine';
import { ErrorService } from './error.service';

@Component({
  selector: 'shell-workflow-create-page',
  standalone: true,
  imports: [WorkflowCreateComponent],
  template: `
    <we-workflow-create
      (workflowCreated)="onWorkflowCreated($event)"
      (cancel)="onCancel()"
      (errorEvent)="onError($event)"
    />
  `,
})
export class WorkflowCreatePageComponent {
  private readonly router = inject(Router);
  private readonly errorService = inject(ErrorService);

  onWorkflowCreated(workflowId: string): void {
    this.router.navigate(['/workflows', workflowId]);
  }

  onCancel(): void {
    this.router.navigate(['/']);
  }

  onError(message: string): void {
    this.errorService.addError(message);
  }
}
