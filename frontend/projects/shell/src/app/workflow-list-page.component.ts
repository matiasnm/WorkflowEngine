import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { WorkflowListComponent } from 'workflow-engine';
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

  onWorkflowSelected(id: string): void {
    this.router.navigate(['/workflows', id]);
  }

  onError(message: string): void {
    this.errorService.addError(message);
  }
}
