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

  get workflowId(): string {
    return this.route.snapshot.paramMap.get('id') ?? '';
  }

  onExecutionCreated(executionId: string): void {
    this.router.navigate(['/executions', executionId]);
  }

  onExecutionSelected(executionId: string): void {
    this.router.navigate(['/executions', executionId]);
  }

  onBack(): void {
    this.location.back();
  }

  onError(message: string): void {
    this.errorService.addError(message);
  }
}
