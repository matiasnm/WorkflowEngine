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
        (workflowsLoaded)="onWorkflowsLoaded($event)"
        (workflowDeleted)="onWorkflowDeleted($event)"
        (errorEvent)="onError($event)"
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
  private readonly errorService = inject(ErrorService);

  onWorkflowSelected(id: string): void {
    this.router.navigate(['/workflows', id]);
  }

  onWorkflowsLoaded(workflows: WorkflowSummary[]): void {
    this.workflowCache.setWorkflows(workflows);
  }

  onWorkflowDeleted(_id: string): void {
    // Cache is refreshed automatically by the component's asyncData.refresh()
  }

  onError(message: string): void {
    this.errorService.addError(message);
  }
}
