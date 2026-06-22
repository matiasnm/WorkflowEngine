import { Injectable, signal } from '@angular/core';
import { WorkflowSummary } from '../models';

/**
 * Signal-based cache for the workflow list.
 *
 * Populated by the home page (WorkflowListPageComponent) after a successful
 * workflow list fetch, and consumed by the executions page
 * (ExecutionsPageComponent) so that AllExecutionsComponent can aggregate
 * executions per workflow without a global API endpoint.
 *
 * Provided in root so a single instance is shared across the shell app.
 */
@Injectable({
  providedIn: 'root',
})
export class WorkflowCacheService {
  private readonly _workflows = signal<WorkflowSummary[] | null>(null);

  /** Read-only signal of the cached workflow list, or `null` if not yet populated. */
  readonly workflows = this._workflows.asReadonly();

  /** Cache the given workflow list, making it available to all consumers. */
  setWorkflows(workflows: WorkflowSummary[]): void {
    this._workflows.set(workflows);
  }

  /** Clear the cached workflow list (e.g. on logout or cache invalidation). */
  clear(): void {
    this._workflows.set(null);
  }
}
