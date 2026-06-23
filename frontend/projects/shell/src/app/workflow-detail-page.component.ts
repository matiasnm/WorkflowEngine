import { Component, inject } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { WorkflowDetailComponent } from 'workflow-engine';

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
    />
  `,
})
export class WorkflowDetailPageComponent {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);

  /** Whether the user arrived here after creating a new workflow. */
  private readonly navigatedFromCreate =
    this.router.getCurrentNavigation()?.extras?.state?.['from'] === 'create';

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
    if (this.navigatedFromCreate) {
      this.router.navigate(['/']);
    } else {
      this.location.back();
    }
  }
}
