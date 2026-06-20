export interface WorkflowSummary {
  id: string; // UUID
  name: string;
  statesCount?: number;
  transitionsCount?: number;
}

export interface StateDefinition {
  code: string;
  name: string;
  terminal: boolean;
}

export interface TransitionDefinition {
  from: string; // state code
  to: string;   // state code
}

export interface WorkflowDetail {
  id: string;
  name: string;
  states: StateDefinition[];
  transitions: TransitionDefinition[];
  initialState: string;
}

export interface CreateWorkflowRequest {
  name: string;
  states: StateDefinition[];
  transitions: TransitionDefinition[];
  initialState: string;
}
