import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { WorkflowListComponent, WorkflowCacheService, WorkflowSummary } from 'workflow-engine';

@Component({
  selector: 'shell-workflow-list-page',
  standalone: true,
  imports: [WorkflowListComponent],
  template: `
    <div class="shell-workflow-list-page">
      <we-workflow-list
        title="Workflows"
        (workflowSelected)="onWorkflowSelected($event)"
        (workflowsLoaded)="onWorkflowsLoaded($event)"
      />
    </div>
  `,
  styles: [`
    .shell-workflow-list-page {
      position: relative;
    }
  `],
})
export class WorkflowListPageComponent {
  private readonly router = inject(Router);
  private readonly workflowCache = inject(WorkflowCacheService);

  onWorkflowSelected(id: string): void {
    this.router.navigate(['/workflows', id]);
  }

  onWorkflowsLoaded(workflows: WorkflowSummary[]): void {
    this.workflowCache.setWorkflows(workflows);
  }
}
