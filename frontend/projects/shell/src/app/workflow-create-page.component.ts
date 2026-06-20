import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { WorkflowCreateComponent } from 'workflow-engine';

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

  onWorkflowCreated(workflowId: string): void {
    this.router.navigate(['/workflows', workflowId]);
  }

  onCancel(): void {
    this.router.navigate(['/']);
  }

  onError(_error: string): void {
    // In a production app, this could show a toast notification.
    // For the shell app, the inline error in the component is sufficient.
  }
}
