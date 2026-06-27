import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { ExecutionResponse, TransitionResponse, HistoryItem, NextStatesResponse, Page, AllExecutionResponse } from '../models';
import { ExecutionApiPort } from './execution-api.port';

/**
 * In-memory fake adapter implementing {@link ExecutionApiPort}.
 *
 * Provides a second adapter implementation (besides the HTTP-based one)
 * to make the seam real. Suitable for tests, Storybook, and development/demo
 * scenarios that do not require a backend.
 *
 * Data is seeded with sensible defaults via {@link createDefaultExecutions}
 * and {@link createDefaultHistory}. Consumers can replace the data after
 * construction by assigning to `executions` / `history`.
 *
 * Transitions are validated against a simple internal state graph:
 * - A terminal state cannot transition further.
 * - The transition must be a registered next-state for the current state.
 */
@Injectable()
export class ExecutionApiFakeAdapter implements ExecutionApiPort {
  /** In-memory map of executions keyed by execution id. */
  executions: Map<string, ExecutionResponse> = new Map();

  /** In-memory map of history items keyed by execution id. */
  history: Map<string, HistoryItem[]> = new Map();

  constructor() {
    this.reset();
  }

  /**
   * Resets all in-memory data back to the default seed values.
   * Useful in `beforeEach` to guarantee a clean state between tests.
   */
  reset(): void {
    this.executions = createDefaultExecutions();
    this.history = createDefaultHistory();
  }

  startExecution(workflowId: string, context?: Record<string, unknown>): Observable<{ executionId: string }> {
    const id = crypto.randomUUID();
    const execution: ExecutionResponse = {
      id,
      workflowId,
      currentState: { code: 'pending', name: 'PENDING', terminal: false },
      currentStateSince: new Date().toISOString(),
    };
    if (context !== undefined && context !== null) {
      execution.context = context;
    }
    this.executions.set(id, execution);
    this.history.set(id, []);
    return of({ executionId: id });
  }

  getExecution(id: string): Observable<ExecutionResponse> {
    const execution = this.executions.get(id);
    if (!execution) {
      return throwError(() => new Error(`Execution '${id}' not found`));
    }
    return of(execution);
  }

  transition(executionId: string, targetStateCode: string): Observable<TransitionResponse> {
    const execution = this.executions.get(executionId);
    if (!execution) {
      return throwError(() => new Error(`Execution '${executionId}' not found`));
    }

    if (execution.currentState.terminal) {
      return throwError(
        () => new Error(`Cannot transition from terminal state '${execution.currentState.code}'`),
      );
    }

    // Validate the target state is a valid next state from the current state
    const allowedNext = NEXT_STATES_MAP.get(execution.currentState.code);
    if (!allowedNext?.includes(targetStateCode)) {
      return throwError(
        () =>
          new Error(
            `Invalid transition from '${execution.currentState.code}' to '${targetStateCode}'`,
          ),
      );
    }

    const previousStateCode = execution.currentState.code;
    const previousStateName = execution.currentState.name;
    const now = new Date().toISOString();

    let currentStateCode = targetStateCode;
    let currentStateName = targetStateCode.toUpperCase();
    let terminal = false;

    // Determine target state name and terminal flag
    const targetDetail = DETAIL_STATES[targetStateCode];
    if (targetDetail) {
      currentStateName = targetDetail.name;
      terminal = targetDetail.terminal;
    }

    const transitionResponse: TransitionResponse = {
      executionId,
      previousStateCode,
      previousStateName,
      currentStateCode,
      currentStateName,
      timestamp: now,
    };

    // Update the execution
    execution.currentState = { code: currentStateCode, name: currentStateName, terminal };
    execution.currentStateSince = now;

    // Record history
    const execHistory = this.history.get(executionId) ?? [];
    execHistory.push({
      fromStateCode: previousStateCode,
      fromStateName: previousStateName,
      toStateCode: currentStateCode,
      toStateName: currentStateName,
      timestamp: now,
    });

    return of(transitionResponse);
  }

  getNextStates(executionId: string): Observable<NextStatesResponse[]> {
    const execution = this.executions.get(executionId);
    if (!execution) {
      return throwError(() => new Error(`Execution '${executionId}' not found`));
    }

    if (execution.currentState.terminal) {
      return of([]);
    }

    const nextStateCodes = NEXT_STATES_MAP.get(execution.currentState.code) ?? [];
    const nextStates: NextStatesResponse[] = nextStateCodes.map((code) => ({
      code,
      name: DETAIL_STATES[code]?.name ?? code.toUpperCase(),
    }));

    return of(nextStates);
  }

  getHistory(executionId: string): Observable<HistoryItem[]> {
    const execHistory = this.history.get(executionId);
    if (!execHistory) {
      // Execution doesn't exist — return empty array instead of error
      return of([]);
    }
    return of([...execHistory]);
  }

  listExecutions(workflowId: string, page = 0, size = 20): Observable<Page<ExecutionResponse>> {
    const allResults: ExecutionResponse[] = [];
    for (const execution of this.executions.values()) {
      if (execution.workflowId === workflowId) {
        allResults.push(execution);
      }
    }
    // Sort newest-first by currentStateSince
    allResults.sort((a, b) => {
      const dateA = a.currentStateSince ? new Date(a.currentStateSince).getTime() : 0;
      const dateB = b.currentStateSince ? new Date(b.currentStateSince).getTime() : 0;
      return dateB - dateA;
    });
    const totalElements = allResults.length;
    const totalPages = totalElements === 0 ? 0 : Math.ceil(totalElements / size);
    const start = page * size;
    const content = allResults.slice(start, start + size);
    return of({ content, page, size, totalElements, totalPages });
  }

  deleteExecution(id: string): Observable<void> {
    this.executions.delete(id);
    this.history.delete(id);
    return of(void 0);
  }

  listAllExecutions(): Observable<AllExecutionResponse[]> {
    const results: AllExecutionResponse[] = [];
    for (const execution of this.executions.values()) {
      results.push({
        ...execution,
        workflowName: WORKFLOW_NAME_MAP.get(execution.workflowId) ?? 'unknown-workflow',
      });
    }
    return of(results);
  }
}

// ── Default seed data ──

const DEFAULT_EXECUTION_UUID_1 = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
const DEFAULT_EXECUTION_UUID_2 = 'b2c3d4e5-f6a7-8901-bcde-f12345678901';

function createDefaultExecutions(): Map<string, ExecutionResponse> {
  const map = new Map<string, ExecutionResponse>();

  map.set(DEFAULT_EXECUTION_UUID_1, {
    id: DEFAULT_EXECUTION_UUID_1,
    workflowId: 'd290f1ee-6c54-4b01-90e6-d701748f0851',
    currentState: { code: 'in_review', name: 'IN_REVIEW', terminal: false },
    currentStateSince: '2026-06-19T10:05:00Z',
  });

  map.set(DEFAULT_EXECUTION_UUID_2, {
    id: DEFAULT_EXECUTION_UUID_2,
    workflowId: 'd290f1ee-6c54-4b01-90e6-d701748f0851',
    currentState: { code: 'created', name: 'CREATED', terminal: false },
    currentStateSince: '2026-06-19T10:00:00Z',
  });

  return map;
}

function createDefaultHistory(): Map<string, HistoryItem[]> {
  const map = new Map<string, HistoryItem[]>();

  map.set(DEFAULT_EXECUTION_UUID_1, [
    {
      fromStateCode: 'created',
      fromStateName: 'CREATED',
      toStateCode: 'in_review',
      toStateName: 'IN_REVIEW',
      timestamp: '2026-06-19T10:05:00Z',
    },
  ]);

  map.set(DEFAULT_EXECUTION_UUID_2, []);

  return map;
}

/**
 * State name and terminal flag lookup for default seed states.
 */
const DETAIL_STATES: Record<string, { name: string; terminal: boolean }> = {
  created: { name: 'CREATED', terminal: false },
  in_review: { name: 'IN_REVIEW', terminal: false },
  approved: { name: 'APPROVED', terminal: true },
  rejected: { name: 'REJECTED', terminal: true },
  pending: { name: 'PENDING', terminal: false },
  confirmed: { name: 'CONFIRMED', terminal: false },
  shipped: { name: 'SHIPPED', terminal: false },
  delivered: { name: 'DELIVERED', terminal: true },
  cancelled: { name: 'CANCELLED', terminal: true },
};

/**
 * Workflow name lookup for default seed data.
 */
const WORKFLOW_NAME_MAP: Map<string, string> = new Map([
  ['d290f1ee-6c54-4b01-90e6-d701748f0851', 'simple-approval'],
]);

/**
 * Allowed next-state transitions for each state code (default seed data).
 */
const NEXT_STATES_MAP: Map<string, string[]> = new Map([
  ['created', ['in_review']],
  ['in_review', ['approved', 'rejected']],
  ['pending', ['confirmed', 'cancelled']],
  ['confirmed', ['shipped', 'cancelled']],
  ['shipped', ['delivered', 'cancelled']],
]);
