import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { WorkflowCreateComponent, WorkflowCacheService, WorkflowSummary } from 'workflow-engine';

@Component({
  selector: 'shell-workflow-create-page',
  standalone: true,
  imports: [WorkflowCreateComponent],
  template: `
    <we-workflow-create
      (workflowCreated)="onWorkflowCreated($event)"
      (cancel)="onCancel()"
    />
  `,
})
export class WorkflowCreatePageComponent {
  private readonly router = inject(Router);
  private readonly workflowCache = inject(WorkflowCacheService);

  onWorkflowCreated(workflow: WorkflowSummary): void {
    this.workflowCache.addWorkflow(workflow);
    this.router.navigate(['/workflows', workflow.id], { state: { from: 'create' } });
  }

  onCancel(): void {
    this.router.navigate(['/']);
  }
}
