import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { WorkflowListComponent } from 'workflow-engine';

@Component({
  selector: 'shell-workflow-list-page',
  standalone: true,
  imports: [WorkflowListComponent, RouterLink],
  template: `
    <div class="shell-workflow-list-page">
      <div class="shell-workflow-list-page__toolbar">
        <we-workflow-list
          title="Workflows"
          (workflowSelected)="onWorkflowSelected($event)"
        />
        <a
          class="shell-btn shell-btn--primary"
          routerLink="/workflows/new"
        >
          + New Workflow
        </a>
      </div>
    </div>
  `,
  styles: [`
    .shell-workflow-list-page {
      position: relative;
    }

    .shell-workflow-list-page__toolbar {
      display: flex;
      align-items: flex-start;
      gap: 16px;
    }

    .shell-workflow-list-page__toolbar we-workflow-list {
      flex: 1;
    }

    .shell-btn {
      display: inline-flex;
      align-items: center;
      padding: 10px 20px;
      border-radius: var(--we-border-radius, 8px);
      font-size: 0.9rem;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      text-decoration: none;
      transition: background 0.15s;
      white-space: nowrap;
    }

    .shell-btn--primary {
      background: var(--we-primary, #1976d2);
      color: #ffffff;
      border: none;
    }

    .shell-btn--primary:hover {
      background: var(--we-primary-hover, #1565c0);
    }

    .shell-btn--primary:focus-visible {
      outline: 2px solid var(--we-primary, #1976d2);
      outline-offset: 2px;
    }
  `],
})
export class WorkflowListPageComponent {
  private readonly router = inject(Router);

  onWorkflowSelected(id: string): void {
    this.router.navigate(['/workflows', id]);
  }
}
