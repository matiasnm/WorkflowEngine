import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { WorkflowListComponent } from 'workflow-engine';

@Component({
  selector: 'shell-workflow-list-page',
  standalone: true,
  imports: [WorkflowListComponent],
  template: `
    <we-workflow-list
      title="Workflows"
      (workflowSelected)="onWorkflowSelected($event)"
    />
  `,
})
export class WorkflowListPageComponent {
  private readonly router = inject(Router);

  onWorkflowSelected(id: string): void {
    this.router.navigate(['/workflows', id]);
  }
}
