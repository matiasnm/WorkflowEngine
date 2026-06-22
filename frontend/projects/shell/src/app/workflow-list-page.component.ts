import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { WorkflowListComponent, WorkflowCacheService, WorkflowSummary } from 'workflow-engine';
import { ErrorService } from './error.service';

@Component({
  selector: 'shell-workflow-list-page',
  standalone: true,
  imports: [WorkflowListComponent],
  template: `
    <div class="shell-workflow-list-page">
      <we-workflow-list
        title="Workflows"
        (workflowSelected)="onWorkflowSelected($event)"
        (errorEvent)="onError($event)"
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
  private readonly errorService = inject(ErrorService);
  private readonly workflowCache = inject(WorkflowCacheService);

  onWorkflowSelected(id: string): void {
    this.router.navigate(['/workflows', id]);
  }

  onError(message: string): void {
    this.errorService.addError(message);
  }

  onWorkflowsLoaded(workflows: WorkflowSummary[]): void {
    this.workflowCache.setWorkflows(workflows);
  }
}
