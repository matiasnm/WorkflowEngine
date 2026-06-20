import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { ExecutionDetailComponent } from 'workflow-engine';
import { ErrorService } from './error.service';

@Component({
  selector: 'shell-execution-detail-page',
  standalone: true,
  imports: [ExecutionDetailComponent],
  template: `
    <we-execution-detail
      [executionId]="executionId"
      (back)="onBack()"
      (errorEvent)="onError($event)"
    />
  `,
})
export class ExecutionDetailPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);
  private readonly errorService = inject(ErrorService);

  get executionId(): string {
    return this.route.snapshot.paramMap.get('id') ?? '';
  }

  onBack(): void {
    this.location.back();
  }

  onError(message: string): void {
    this.errorService.addError(message);
  }
}
