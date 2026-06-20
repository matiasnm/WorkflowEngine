import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { WorkflowSummary, WorkflowDetail, CreateWorkflowRequest } from '../models';
import { WorkflowApiPort } from './workflow-api.port';

/**
 * In-memory fake adapter implementing {@link WorkflowApiPort}.
 *
 * Provides a second adapter implementation (besides the HTTP-based one)
 * to make the seam real. Suitable for tests, Storybook, and development/demo
 * scenarios that do not require a backend.
 *
 * Data is seeded with sensible defaults via {@link createDefaultWorkflows}
 * and {@link createDefaultDetails}. Consumers can replace the data after
 * construction by assigning to `workflows` / `details`.
 */
@Injectable()
export class WorkflowApiFakeAdapter implements WorkflowApiPort {
  /** In-memory list of workflow summaries. */
  workflows: WorkflowSummary[] = [];

  /** In-memory map of workflow details keyed by workflow id. */
  details: Map<string, WorkflowDetail> = new Map();

  constructor() {
    this.reset();
  }

  /**
   * Resets all in-memory data back to the default seed values.
   * Useful in `beforeEach` to guarantee a clean state between tests.
   */
  reset(): void {
    this.workflows = createDefaultWorkflows();
    this.details = createDefaultDetails();
  }

  listWorkflows(): Observable<WorkflowSummary[]> {
    return of(this.workflows);
  }

  getWorkflow(id: string): Observable<WorkflowDetail> {
    const detail = this.details.get(id);
    if (!detail) {
      return throwError(() => new Error(`Workflow '${id}' not found`));
    }
    return of(detail);
  }

  createWorkflow(request: CreateWorkflowRequest): Observable<{ workflowId: string }> {
    const id = crypto.randomUUID();
    const detail: WorkflowDetail = {
      id,
      name: request.name,
      states: request.states,
      transitions: request.transitions,
      initialState: request.initialState,
    };
    this.details.set(id, detail);
    // Also add a summary entry
    this.workflows = [
      ...this.workflows,
      {
        id,
        name: request.name,
        statesCount: request.states.length,
        transitionsCount: request.transitions.length,
      },
    ];
    return of({ workflowId: id });
  }
}

// ── Default seed data ──

const DEFAULT_WORKFLOW_UUID_1 = 'd290f1ee-6c54-4b01-90e6-d701748f0851';
const DEFAULT_WORKFLOW_UUID_2 = 'e390f2ee-7d65-4c02-91f7-e812749f0962';

function createDefaultWorkflows(): WorkflowSummary[] {
  return [
    { id: DEFAULT_WORKFLOW_UUID_1, name: 'simple-approval', statesCount: 4, transitionsCount: 3 },
    { id: DEFAULT_WORKFLOW_UUID_2, name: 'order-fulfillment', statesCount: 5, transitionsCount: 6 },
  ];
}

function createDefaultDetails(): Map<string, WorkflowDetail> {
  const map = new Map<string, WorkflowDetail>();

  map.set(DEFAULT_WORKFLOW_UUID_1, {
    id: DEFAULT_WORKFLOW_UUID_1,
    name: 'simple-approval',
    states: [
      { code: 'created', name: 'CREATED', terminal: false },
      { code: 'in_review', name: 'IN_REVIEW', terminal: false },
      { code: 'approved', name: 'APPROVED', terminal: true },
      { code: 'rejected', name: 'REJECTED', terminal: true },
    ],
    transitions: [
      { from: 'created', to: 'in_review' },
      { from: 'in_review', to: 'approved' },
      { from: 'in_review', to: 'rejected' },
    ],
    initialState: 'created',
  });

  map.set(DEFAULT_WORKFLOW_UUID_2, {
    id: DEFAULT_WORKFLOW_UUID_2,
    name: 'order-fulfillment',
    states: [
      { code: 'pending', name: 'PENDING', terminal: false },
      { code: 'confirmed', name: 'CONFIRMED', terminal: false },
      { code: 'shipped', name: 'SHIPPED', terminal: false },
      { code: 'delivered', name: 'DELIVERED', terminal: true },
      { code: 'cancelled', name: 'CANCELLED', terminal: true },
    ],
    transitions: [
      { from: 'pending', to: 'confirmed' },
      { from: 'pending', to: 'cancelled' },
      { from: 'confirmed', to: 'shipped' },
      { from: 'confirmed', to: 'cancelled' },
      { from: 'shipped', to: 'delivered' },
      { from: 'shipped', to: 'cancelled' },
    ],
    initialState: 'pending',
  });

  return map;
}
