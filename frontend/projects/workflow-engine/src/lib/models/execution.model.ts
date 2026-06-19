export interface ExecutionResponse {
  id: string;
  workflowId: string;
  currentState: import('./workflow.model').StateDefinition;
  /** ISO-8601 timestamp of when the execution entered its current state. */
  currentStateSince?: string;
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
