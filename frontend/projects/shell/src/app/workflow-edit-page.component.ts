import { Component, inject } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { WorkflowEditComponent } from 'workflow-engine';
import { ErrorService } from './error.service';

@Component({
  selector: 'shell-workflow-edit-page',
  standalone: true,
  imports: [WorkflowEditComponent],
  template: `
    <we-workflow-edit
      [workflowId]="workflowId"
      (workflowUpdated)="onWorkflowUpdated($event)"
      (cancel)="onCancel()"
      (errorEvent)="onError($event)"
    />
  `,
})
export class WorkflowEditPageComponent {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly errorService = inject(ErrorService);

  get workflowId(): string {
    return this.route.snapshot.paramMap.get('id') ?? '';
  }

  onWorkflowUpdated(_id: string): void {
    this.router.navigate(['/workflows', _id], { state: { from: 'edit' } });
  }

  onCancel(): void {
    this.router.navigate(['/workflows', this.workflowId]);
  }

  onError(message: string): void {
    this.errorService.addError(message);
  }
}
