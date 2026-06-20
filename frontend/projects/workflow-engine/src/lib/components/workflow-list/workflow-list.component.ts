import { Component, input, Output, EventEmitter, signal, computed, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { WorkflowApiService } from '../../services/workflow-api.service';
import { WorkflowSummary } from '../../models';

@Component({
  selector: 'we-workflow-list',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="we-workflow-list">
      @if (title(); as t) {
        <h2 class="we-workflow-list__title">{{ t }}</h2>
      }

      <!-- Loading state: skeleton shimmer with 3 placeholder rows -->
      @if (loading()) {
        <div class="we-workflow-list__skeleton" aria-label="Loading workflows">
          @for (_ of [1, 2, 3]; track $index) {
            <div class="we-skeleton-card">
              <div class="we-skeleton-line we-skeleton-line--title"></div>
              <div class="we-skeleton-line we-skeleton-line--subtitle"></div>
            </div>
          }
        </div>
      }

      <!-- Error state: inline error message + retry button -->
      @if (error(); as err) {
        <div class="we-workflow-list__error" role="alert">
          <span class="we-error-icon" aria-hidden="true">⚠</span>
          <span class="we-error-text">{{ err }}</span>
          <button class="we-btn we-btn--retry" (click)="loadWorkflows()">
            Retry
          </button>
        </div>
      }

      <!-- Success state (with data): workflow cards with search -->
      @if (!loading() && !error() && workflows().length > 0) {
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
      @if (!loading() && !error() && workflows().length === 0) {
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

    /* ── Skeleton / Shimmer ── */
    .we-workflow-list__skeleton {
      display: flex;
      flex-direction: column;
      gap: var(--we-spacing, 16px);
    }

    .we-skeleton-card {
      background: var(--we-bg, #ffffff);
      border: 1px solid var(--we-border, #e0e0e0);
      border-radius: var(--we-border-radius, 8px);
      padding: var(--we-spacing, 16px);
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .we-skeleton-line {
      height: 14px;
      border-radius: 4px;
      background: linear-gradient(
        90deg,
        var(--we-bg-secondary, #f5f5f5) 25%,
        #e8e8e8 50%,
        var(--we-bg-secondary, #f5f5f5) 75%
      );
      background-size: 200% 100%;
      animation: we-shimmer 1.5s ease-in-out infinite;
    }

    .we-skeleton-line--title {
      width: 60%;
      height: 18px;
    }

    .we-skeleton-line--subtitle {
      width: 40%;
    }

    @keyframes we-shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    /* ── Error state ── */
    .we-workflow-list__error {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 16px;
      background: #fff3f3;
      border: 1px solid var(--we-danger, #d32f2f);
      border-radius: var(--we-border-radius, 8px);
      color: var(--we-danger, #d32f2f);
      font-size: 0.9rem;
    }

    .we-error-icon {
      font-size: 1.1rem;
    }

    .we-error-text {
      flex: 1;
    }

    .we-btn--retry {
      padding: 6px 16px;
      border: 1px solid var(--we-danger, #d32f2f);
      border-radius: var(--we-border-radius, 8px);
      background: var(--we-bg, #ffffff);
      color: var(--we-danger, #d32f2f);
      font-size: 0.85rem;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.15s;
    }

    .we-btn--retry:hover {
      background: var(--we-danger, #d32f2f);
      color: #ffffff;
    }

    .we-btn--retry:focus-visible {
      outline: 2px solid var(--we-primary, #1976d2);
      outline-offset: 2px;
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
export class WorkflowListComponent implements OnInit {
  private readonly api = inject(WorkflowApiService);

  /** Optional heading shown above the list. */
  readonly title = input<string>();

  /** Emitted when the user clicks a workflow card. */
  @Output() workflowSelected = new EventEmitter<string>();

  /** Emitted when an error occurs, so the host app can react (toast, etc.). */
  @Output() errorEvent = new EventEmitter<string>();

  /** Reactive state */
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly workflows = signal<WorkflowSummary[]>([]);
  readonly searchQuery = signal<string>('');

  /** Computed: client-side filtered workflows by name (case-insensitive). */
  readonly filteredWorkflows = computed(() => {
    const query = this.searchQuery().toLowerCase();
    if (!query) return this.workflows();
    return this.workflows().filter(w =>
      w.name.toLowerCase().includes(query)
    );
  });

  ngOnInit(): void {
    this.loadWorkflows();
  }

  protected loadWorkflows(): void {
    this.loading.set(true);
    this.error.set(null);

    this.api.listWorkflows().subscribe({
      next: (list) => {
        this.workflows.set(list);
        this.loading.set(false);
      },
      error: (err) => {
        const message = 'Failed to load workflows.';
        this.error.set(message);
        this.errorEvent.emit(message);
        this.loading.set(false);
      },
    });
  }

  protected selectWorkflow(id: string): void {
    this.workflowSelected.emit(id);
  }
}
