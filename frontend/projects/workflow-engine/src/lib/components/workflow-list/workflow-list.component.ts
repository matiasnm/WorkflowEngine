import { Component, input, Output, EventEmitter, signal, computed, inject, DestroyRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { WorkflowApiPort, WORKFLOW_API_PORT } from '../../services/workflow-api.port';
import { asyncData } from '../../util';
import { ErrorBannerComponent, SkeletonCardComponent } from '../ui';

@Component({
  selector: 'we-workflow-list',
  standalone: true,
  imports: [FormsModule, ErrorBannerComponent, SkeletonCardComponent],
  styleUrl: '../../styles/shared.css',
  template: `
    <div class="we-workflow-list">
      @if (title(); as t) {
        <h2 class="we-workflow-list__title">{{ t }}</h2>
      }

      <!-- Loading state: skeleton shimmer with 3 placeholder rows -->
      @if (workflows.loading()) {
        <div class="we-workflow-list__skeleton" aria-label="Loading workflows">
          @for (_ of [1, 2, 3]; track $index) {
            <we-skeleton-card [lines]="[
              { width: '60%', height: '18px' },
              { width: '40%' }
            ]" />
          }
        </div>
      }

      <!-- Error state: inline error message + retry button -->
      @if (workflows.error(); as err) {
        <we-error-banner [message]="err" [showRetry]="true" (retry)="workflows.refresh()" />
      }

      <!-- Success state (with data): workflow cards with search -->
      @if (!workflows.loading() && !workflows.error() && (workflows.data() ?? []).length > 0) {
        <!-- Search input -->
        <div class="we-workflow-list__search">
          <input
            class="we-input we-input--search"
            type="search"
            placeholder="Search workflows..."
            [ngModel]="searchQuery()"
            (ngModelChange)="searchQuery.set($event)"
            aria-label="Search workflows"
          />
        </div>

        <!-- Filtered empty state -->
        @if (filteredWorkflows().length === 0) {
          <div class="we-workflow-list__search-empty">
            <p>No workflows match '{{ searchQuery() }}'</p>
          </div>
        }

        <!-- Workflow cards -->
        @if (filteredWorkflows().length > 0) {
          <div class="we-workflow-list__cards">
            @for (wf of filteredWorkflows(); track wf.id) {
              <button
                class="we-workflow-card"
                (click)="selectWorkflow(wf.id)"
                [attr.aria-label]="'View workflow ' + wf.name"
              >
                <span class="we-workflow-card__name">{{ wf.name }}</span>
                <span class="we-workflow-card__summary">
                  {{ wf.statesCount ?? '?' }} states · {{ wf.transitionsCount ?? '?' }} transitions
                </span>
              </button>
            }
          </div>
        }
      }

      <!-- Empty state (no workflows at all) -->
      @if (!workflows.loading() && !workflows.error() && (workflows.data() ?? []).length === 0) {
        <div class="we-workflow-list__empty">
          <p>No workflows found. Create one via the API.</p>
        </div>
      }
    </div>
  `,
  styles: [`
    .we-workflow-list {
      font-family: var(--we-font-family, system-ui, -apple-system, sans-serif);
      padding: var(--we-spacing, 16px);
      max-width: 640px;
      margin: 0 auto;
    }

    .we-workflow-list__title {
      font-size: 1.5rem;
      font-weight: 600;
      color: var(--we-text, #212121);
      margin: 0 0 var(--we-spacing, 16px);
    }

    /* ── Search input ── */
    .we-workflow-list__search {
      margin-bottom: var(--we-spacing-md, 16px);
    }

    .we-input--search {
      width: 100%;
      max-width: 400px;
      padding: 8px 12px;
      border: 1px solid var(--we-border-color, #ccc);
      border-radius: var(--we-border-radius, 4px);
      font-family: inherit;
      font-size: 0.9rem;
      box-sizing: border-box;
    }

    .we-input--search:focus {
      outline: none;
      border-color: var(--we-primary, #1976d2);
      box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.12);
    }

    .we-workflow-list__search-empty {
      text-align: center;
      padding: 32px 16px;
      color: var(--we-text-secondary, #757575);
      border: 1px dashed var(--we-border, #e0e0e0);
      border-radius: var(--we-border-radius, 8px);
      margin-bottom: var(--we-spacing, 16px);
    }

    .we-workflow-list__search-empty p {
      margin: 0;
      font-size: 0.95rem;
    }

    /* ── Skeleton / Shimmer container ── */
    .we-workflow-list__skeleton {
      display: flex;
      flex-direction: column;
      gap: var(--we-spacing, 16px);
    }

    /* ── Empty state ── */
    .we-workflow-list__empty {
      text-align: center;
      padding: 48px 16px;
      color: var(--we-text-secondary, #757575);
      border: 1px dashed var(--we-border, #e0e0e0);
      border-radius: var(--we-border-radius, 8px);
    }

    .we-workflow-list__empty p {
      margin: 0;
      font-size: 0.95rem;
    }

    /* ── Workflow cards ── */
    .we-workflow-list__cards {
      display: flex;
      flex-direction: column;
      gap: var(--we-spacing, 16px);
    }

    .we-workflow-card {
      display: flex;
      flex-direction: column;
      gap: 4px;
      width: 100%;
      text-align: left;
      padding: var(--we-spacing, 16px);
      background: var(--we-bg, #ffffff);
      border: 1px solid var(--we-border, #e0e0e0);
      border-radius: var(--we-border-radius, 8px);
      cursor: pointer;
      transition: border-color 0.15s, box-shadow 0.15s;
      font-family: inherit;
      font-size: inherit;
    }

    .we-workflow-card:hover {
      border-color: var(--we-primary, #1976d2);
      box-shadow: 0 1px 4px rgba(25, 118, 210, 0.12);
    }

    .we-workflow-card:focus-visible {
      outline: 2px solid var(--we-primary, #1976d2);
      outline-offset: 2px;
    }

    .we-workflow-card__name {
      font-size: 1.05rem;
      font-weight: 600;
      color: var(--we-text, #212121);
    }

    .we-workflow-card__summary {
      font-size: 0.85rem;
      color: var(--we-text-secondary, #757575);
    }
  `],
})
export class WorkflowListComponent {
  private readonly api = inject(WORKFLOW_API_PORT);
  private readonly destroyRef = inject(DestroyRef);

  /** Optional heading shown above the list. */
  readonly title = input<string>();

  /** Emitted when the user clicks a workflow card. */
  @Output() workflowSelected = new EventEmitter<string>();

  /** Emitted when an error occurs, so the host app can react (toast, etc.). */
  @Output() errorEvent = new EventEmitter<string>();

  /** Reactive async data for the workflow list. */
  protected readonly workflows = asyncData(
    () => this.api.listWorkflows(),
    {
      errorMessage: 'Failed to load workflows.',
      onError: () => this.errorEvent.emit('Failed to load workflows.'),
      destroyRef: this.destroyRef,
    },
  );

  /** Client-side search query. */
  readonly searchQuery = signal<string>('');

  /** Computed: client-side filtered workflows by name (case-insensitive). */
  readonly filteredWorkflows = computed(() => {
    const data = this.workflows.data();
    if (!data) return [];
    const query = this.searchQuery().toLowerCase();
    if (!query) return data;
    return data.filter(w =>
      w.name.toLowerCase().includes(query)
    );
  });

  protected selectWorkflow(id: string): void {
    this.workflowSelected.emit(id);
  }
}
