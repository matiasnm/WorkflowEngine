export interface ExecutionResponse {
  id: string;
  workflowId: string;
  currentState: import('./workflow.model').StateDefinition;
  /** ISO-8601 timestamp of when the execution entered its current state. */
  currentStateSince?: string;
  /** Arbitrary JSON context attached at execution creation (nullable). */
  context?: Record<string, unknown>;
}

export interface TransitionResponse {
  executionId: string;
  previousStateCode: string;
  previousStateName: string;
  currentStateCode: string;
  currentStateName: string;
  timestamp: string; // ISO-8601
}

export interface HistoryItem {
  fromStateCode: string;
  fromStateName: string;
  toStateCode: string;
  toStateName: string;
  timestamp: string;
}

export interface NextStatesResponse {
  code: string;
  name: string;
}

/**
 * Generic paginated response matching the backend's page envelope.
 */
export interface Page<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

/** Backward-compatible alias for {@link Page}<{@link ExecutionResponse}>. */
export type ExecutionPageResponse = Page<ExecutionResponse>;

export interface AllExecutionResponse {
  id: string;
  workflowId: string;
  workflowName: string;
  currentState: import('./workflow.model').StateDefinition;
  currentStateSince?: string;
  /** Arbitrary JSON context attached at execution creation (nullable). */
  context?: Record<string, unknown>;
}
