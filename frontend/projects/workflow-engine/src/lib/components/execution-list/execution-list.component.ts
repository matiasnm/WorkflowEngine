import { Component, input, Output, EventEmitter, signal, computed, inject, DestroyRef, effect, untracked } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Subscription } from 'rxjs';
import { ExecutionApiPort, EXECUTION_API_PORT } from '../../services/execution-api.port';
import { ExecutionResponse, Page } from '../../models';
import { ErrorBannerComponent, SpinnerComponent } from '../ui';
import { StateColorService } from '../../services/state-color.service';

@Component({
  selector: 'we-execution-list',
  standalone: true,
  imports: [DatePipe, ErrorBannerComponent, SpinnerComponent],
  styleUrl: '../../styles/shared.css',
  template: `
    <div class="we-execution-list">
      <!-- Loading state: skeleton with 3 shimmer rows -->
      @if (loading()) {
        <div class="we-execution-list__skeleton" aria-label="Loading executions">
          @for (_ of [1, 2, 3]; track $index) {
            <div class="we-skeleton-row">
              <div class="we-skeleton-line we-skeleton-line--id"></div>
              <div class="we-skeleton-line we-skeleton-line--state"></div>
              <div class="we-skeleton-line we-skeleton-line--since"></div>
            </div>
          }
        </div>
      }

      <!-- Error state: inline error message (no retry — parent handles it) -->
      @if (error(); as err) {
        <we-error-banner [message]="err" />
      }

      <!-- Empty state -->
      @if (!loading() && !error() && executions().length === 0) {
        <div class="we-execution-list__empty">
          <p>No executions yet. Start one above.</p>
        </div>
      }

      <!-- Success state: execution table with optional page-loading overlay -->
      @if (!loading() && !error() && executions().length > 0) {
        <div
          class="we-execution-list__table-wrapper"
          [class.we-execution-list__table-wrapper--loading]="pageLoading()"
          #tableWrapper
        >
          <table class="we-execution-list__table">
            <thead>
              <tr>
                <th>ID</th>
                <th>State</th>
                <th>Since</th>
                <th aria-label="Actions"></th>
              </tr>
            </thead>
            <tbody>
              @for (exec of executions(); track exec.id) {
                <tr
                  class="we-execution-row"
                  (click)="selectExecution(exec.id)"
                  [attr.aria-label]="'View execution ' + truncateId(exec.id)"
                >
                  <td><code>{{ truncateId(exec.id) }}</code></td>
                  <td>
                    <span class="we-state-swatch" [style.background-color]="getStateColor(exec.currentState.code)"></span>
                    <span class="we-execution-state">{{ exec.currentState.name }}</span>
                    <span class="we-execution-state-code">({{ exec.currentState.code }})</span>
                  </td>
                  <td>
                    @if (exec.currentStateSince) {
                      {{ exec.currentStateSince | date:'short' }}
                    }
                  </td>
                  <td class="we-execution-row__actions">
                    <button
                      class="we-execution-row__delete"
                      (click)="deleteExecution($event, exec.id)"
                      [attr.aria-label]="'Delete execution ' + truncateId(exec.id)"
                      title="Delete execution"
                    >✕</button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Pagination controls -->
        @if (showPagination()) {
          <div class="we-pagination" [class.we-pagination--loading]="pageLoading()">
            <button
              class="we-pagination__btn we-pagination__btn--prev"
              (click)="goToPreviousPage()"
              [disabled]="isFirstPage() || pageLoading()"
              aria-label="Previous page"
            >← Previous</button>

            <span class="we-pagination__info">Page {{ currentPageDisplay() }} of {{ totalPages() }}</span>

            <button
              class="we-pagination__btn we-pagination__btn--next"
              (click)="goToNextPage()"
              [disabled]="isLastPage() || pageLoading()"
              aria-label="Next page"
            >Next →</button>

            @if (pageLoading()) {
              <we-spinner size="small" color="primary" />
            }
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .we-execution-list {
      font-family: var(--we-font-family, system-ui, -apple-system, sans-serif);
    }

    /* ── Skeleton / Shimmer ── */
    .we-execution-list__skeleton {
      display: flex;
      flex-direction: column;
      gap: var(--we-spacing-sm, 8px);
    }

    .we-skeleton-row {
      display: flex;
      gap: var(--we-spacing, 16px);
      padding: var(--we-spacing-md, 12px) var(--we-spacing, 16px);
      background: var(--we-bg, #ffffff);
      border: 1px solid var(--we-border, #e0e0e0);
      border-radius: var(--we-border-radius, 8px);
    }

    .we-skeleton-line--id {
      width: 80px;
    }

    .we-skeleton-line--state {
      width: 140px;
    }

    .we-skeleton-line--since {
      width: 120px;
      margin-left: auto;
    }

    /* ── Empty state ── */
    .we-execution-list__empty {
      text-align: center;
      padding: var(--we-spacing-xl, 32px) var(--we-spacing, 16px);
      color: var(--we-text-secondary, #757575);
      border: 1px dashed var(--we-border, #e0e0e0);
      border-radius: var(--we-border-radius, 8px);
    }

    .we-execution-list__empty p {
      margin: 0;
      font-size: var(--we-font-size-base, 0.9rem);
    }

    /* ── Table ── */
    .we-execution-list__table-wrapper {
      overflow-x: auto;
      transition: opacity var(--we-transition, 0.2s) ease;
    }

    .we-execution-list__table-wrapper--loading {
      opacity: 0.5;
      pointer-events: none;
    }

    .we-execution-list__table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid var(--we-border, #e0e0e0);
      border-radius: var(--we-border-radius, 8px);
      overflow: hidden;
    }

    .we-execution-list__table th,
    .we-execution-list__table td {
      padding: 10px var(--we-spacing, 16px);
      text-align: left;
      font-size: var(--we-font-size-base, 0.9rem);
    }

    .we-execution-list__table thead {
      background: var(--we-bg-secondary, #f5f5f5);
    }

    .we-execution-list__table th {
      font-weight: 600;
      color: var(--we-text-secondary, #757575);
      text-transform: uppercase;
      font-size: var(--we-font-size-sm, 0.85rem);
      letter-spacing: 0.03em;
    }

    .we-execution-list__table tbody tr {
      border-top: 1px solid var(--we-border, #e0e0e0);
    }

    .we-execution-list__table tbody tr:hover {
      background: var(--we-bg-secondary, #f5f5f5);
    }

    .we-execution-list__table code {
      font-family: var(--we-font-family-mono, 'Cascadia Code', 'Fira Code', 'Consolas', monospace);
      font-size: var(--we-font-size-sm, 0.85rem);
      background: var(--we-bg-secondary, #f5f5f5);
      padding: 2px 6px;
      border-radius: var(--we-border-radius-sm, 4px);
    }

    .we-execution-state {
      font-weight: 600;
      color: var(--we-text, #212121);
    }

    .we-execution-state-code {
      color: var(--we-text-secondary, #757575);
      font-size: var(--we-font-size-sm, 0.85rem);
      margin-left: var(--we-spacing-xs, 4px);
    }

    .we-execution-row__actions {
      width: 40px;
      text-align: center;
    }

    .we-execution-row__delete {
      width: 24px;
      height: 24px;
      padding: 0;
      border: 1px solid transparent;
      border-radius: var(--we-border-radius-sm, 4px);
      background: transparent;
      color: var(--we-text-secondary, #757575);
      font-size: 0.75rem;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: color var(--we-transition, 0.15s), background var(--we-transition, 0.15s), border-color var(--we-transition, 0.15s);
      line-height: 1;
      opacity: 0.6;
    }

    .we-execution-row__delete:hover {
      opacity: 1;
      color: var(--we-danger, #d32f2f);
      background: var(--we-danger-bg, #fff3f3);
      border-color: var(--we-danger, #d32f2f);
    }

    .we-execution-row__delete:focus-visible {
      outline: 2px solid var(--we-primary, #1976d2);
      outline-offset: 2px;
    }

    /* ── Pagination ── */
    .we-pagination {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--we-spacing, 16px);
      padding: var(--we-spacing-md, 12px) 0;
      font-size: var(--we-font-size-base, 0.9rem);
      color: var(--we-text, #212121);
    }

    .we-pagination__btn {
      padding: 6px var(--we-spacing, 16px);
      border: 1px solid var(--we-border, #e0e0e0);
      border-radius: var(--we-border-radius, 8px);
      background: var(--we-bg, #ffffff);
      color: var(--we-text, #212121);
      font-size: var(--we-font-size-base, 0.9rem);
      font-weight: 500;
      cursor: pointer;
      font-family: inherit;
      transition: background var(--we-transition, 0.15s), border-color var(--we-transition, 0.15s);
    }

    .we-pagination__btn:hover:not(:disabled) {
      background: var(--we-bg-secondary, #f5f5f5);
      border-color: var(--we-primary, #1976d2);
      color: var(--we-primary, #1976d2);
    }

    .we-pagination__btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .we-pagination__btn:focus-visible {
      outline: 2px solid var(--we-primary, #1976d2);
      outline-offset: 2px;
    }

    .we-pagination__info {
      font-weight: 500;
      white-space: nowrap;
    }

    .we-pagination--loading .we-pagination__info {
      color: var(--we-text-secondary, #757575);
    }
  `],
})
export class ExecutionListComponent {
  private readonly api = inject(EXECUTION_API_PORT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly stateColorService = inject(StateColorService);
  private loadSubscription: Subscription | null = null;

  /** Required workflow UUID to load executions for. */
  readonly workflowId = input.required<string>();

  /** Optional page size (default 20). */
  readonly pageSize = input<number>(20);

  /** Emitted when user clicks an execution row. */
  @Output() executionSelected = new EventEmitter<string>();

  /** Emitted when an execution is successfully deleted. */
  @Output() executionDeleted = new EventEmitter<string>();

  /** Emitted on API error, for host app integration. */
  @Output() errorEvent = new EventEmitter<string>();

  // ── Pagination state ──

  /** The currently displayed page (zero-based). */
  private readonly currentPage = signal(0);

  /** Total pages from the last response. */
  protected readonly totalPages = signal(0);

  /** Total elements from the last response. */
  protected readonly totalElements = signal(0);

  /** Counter bumped to trigger a re-fetch (avoids signal-loop via currentPage). */
  private readonly refreshTrigger = signal(0);

  // ── Async state ──

  /** Execution list for the current page. */
  protected readonly executions = signal<ExecutionResponse[]>([]);

  /** True during the very first load (shows skeleton). */
  protected readonly loading = signal(true);

  /** True while navigating between pages (overlay spinner, no skeleton). */
  protected readonly pageLoading = signal(false);

  /** Error message, or null. */
  protected readonly error = signal<string | null>(null);

  // ── Derived state ──

  /** Whether to show pagination controls (multi-page). */
  protected readonly showPagination = computed(() => this.totalPages() > 1);

  /** True when on the first page. */
  protected readonly isFirstPage = computed(() => this.currentPage() === 0);

  /** True when on the last page. */
  protected readonly isLastPage = computed(() => this.currentPage() >= this.totalPages() - 1);

  /** 1-based page number for display. */
  protected readonly currentPageDisplay = computed(() => this.currentPage() + 1);

  constructor() {
    // Reset pagination when the workflow changes
    effect(() => {
      this.workflowId(); // track it
      this.currentPage.set(0);
      this.refreshTrigger.update(v => v + 1);
    });

    // Fetch data when workflowId, pageSize, or refreshTrigger changes
    effect(() => {
      const id = this.workflowId();
      const size = this.pageSize();
      const _trigger = this.refreshTrigger();

      if (!id) return;

      const page = untracked(this.currentPage);
      this.fetchPage(id, page, size);
    });

    // Clean up subscription on destroy
    this.destroyRef.onDestroy(() => {
      this.loadSubscription?.unsubscribe();
    });
  }

  private fetchPage(workflowId: string, page: number, size: number): void {
    this.loadSubscription?.unsubscribe();

    // Use untracked so that reading this.executions() doesn't create a
    // signal dependency in the calling effect (which would cause infinite re-fetch).
    const isPageNav = untracked(() => this.executions()).length > 0;
    this.loading.set(!isPageNav);
    this.pageLoading.set(isPageNav);
    this.error.set(null);

    this.loadSubscription = this.api.listExecutions(workflowId, page, size).subscribe({
      next: (pageData: Page<ExecutionResponse>) => {
        this.executions.set(pageData.content);
        this.totalPages.set(pageData.totalPages);
        this.totalElements.set(pageData.totalElements);
        // Avoid re-triggering the effect if the page matches what we requested
        if (pageData.page !== untracked(this.currentPage)) {
          this.currentPage.set(pageData.page);
        }
        this.loading.set(false);
        this.pageLoading.set(false);
      },
      error: (err) => {
        const message = 'Failed to load executions.';
        this.error.set(message);
        this.loading.set(false);
        this.pageLoading.set(false);
        this.errorEvent.emit(message);
      },
    });
  }

  // ── Public methods ──

  /** Navigate to the previous page. */
  protected goToPreviousPage(): void {
    if (untracked(this.currentPage) <= 0) return;
    this.currentPage.update(p => p - 1);
    this.refreshTrigger.update(v => v + 1);
    this.scrollToTop();
  }

  /** Navigate to the next page. */
  protected goToNextPage(): void {
    if (untracked(this.currentPage) >= this.totalPages() - 1) return;
    this.currentPage.update(p => p + 1);
    this.refreshTrigger.update(v => v + 1);
    this.scrollToTop();
  }

  /** Reload the list from the first page. */
  refresh(): void {
    this.currentPage.set(0);
    this.refreshTrigger.update(v => v + 1);
  }

  private scrollToTop(): void {
    const el = document.querySelector('.we-execution-list');
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  protected selectExecution(id: string): void {
    this.executionSelected.emit(id);
  }

  protected truncateId(id: string): string {
    return id.length > 8 ? id.substring(0, 4) + '…' : id;
  }

  protected getStateColor(stateCode: string): string | null {
    return this.stateColorService.getColor(this.workflowId(), stateCode);
  }

  protected deleteExecution(event: MouseEvent, id: string): void {
    event.stopPropagation();
    if (!confirm('Are you sure you want to delete this execution?')) {
      return;
    }
    this.api.deleteExecution(id).subscribe({
      next: () => {
        this.executionDeleted.emit(id);
        this.refresh();
      },
      error: (err) => {
        const message = err?.error?.detail ?? err?.message ?? 'Failed to delete execution.';
        this.errorEvent.emit(message);
      },
    });
  }
}
