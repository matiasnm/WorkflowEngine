import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AllExecutionsComponent, WorkflowCacheService } from 'workflow-engine';

@Component({
  selector: 'shell-executions-page',
  standalone: true,
  imports: [AllExecutionsComponent],
  template: `
    <div class="shell-executions-page">
      <we-all-executions
        [workflows]="cachedWorkflows()"
        (executionSelected)="onExecutionSelected($event)"
      />
    </div>
  `,
  styles: [`
    .shell-executions-page {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
  `],
})
export class ExecutionsPageComponent {
  private readonly router = inject(Router);
  private readonly workflowCache = inject(WorkflowCacheService);

  /** Read-only signal of the cached workflow list (null until the home page loads). */
  protected readonly cachedWorkflows = this.workflowCache.workflows;

  onExecutionSelected(id: string): void {
    this.router.navigate(['/executions', id]);
  }
}
