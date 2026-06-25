import { Component, inject } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { WorkflowDetailComponent } from 'workflow-engine';
import { ErrorService } from './error.service';

@Component({
  selector: 'shell-workflow-detail-page',
  standalone: true,
  imports: [WorkflowDetailComponent],
  template: `
    <we-workflow-detail
      [workflowId]="workflowId"
      (executionCreated)="onExecutionCreated($event)"
      (executionSelected)="onExecutionSelected($event)"
      (editWorkflow)="onEditWorkflow($event)"
      (workflowDeleted)="onWorkflowDeleted($event)"
      (back)="onBack()"
      (errorEvent)="onError($event)"
    />
  `,
})
export class WorkflowDetailPageComponent {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);
  private readonly errorService = inject(ErrorService);

  /** Whether the user arrived here after creating a new workflow. */
  private readonly navigatedFromCreate =
    this.router.getCurrentNavigation()?.extras?.state?.['from'] === 'create';

  /** Whether the user arrived here after editing the workflow. */
  private readonly navigatedFromEdit =
    this.router.getCurrentNavigation()?.extras?.state?.['from'] === 'edit';

  get workflowId(): string {
    return this.route.snapshot.paramMap.get('id') ?? '';
  }

  onExecutionCreated(executionId: string): void {
    this.router.navigate(['/executions', executionId]);
  }

  onExecutionSelected(executionId: string): void {
    this.router.navigate(['/executions', executionId]);
  }

  onEditWorkflow(workflowId: string): void {
    this.router.navigate(['/workflows', workflowId, 'edit']);
  }

  onWorkflowDeleted(_id: string): void {
    this.router.navigate(['/']);
  }

  onBack(): void {
    if (this.navigatedFromCreate || this.navigatedFromEdit) {
      this.router.navigate(['/']);
    } else {
      this.location.back();
    }
  }

  onError(message: string): void {
    this.errorService.addError(message);
  }
}
