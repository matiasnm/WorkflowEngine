describe('WorkflowModel', () => {
  it('should have the correct structure for WorkflowSummary', () => {
    const summary: import('./workflow.model').WorkflowSummary = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'test-workflow',
      statesCount: 4,
      transitionsCount: 3,
    };
    expect(summary.id).toBeDefined();
    expect(summary.name).toBeDefined();
    expect(summary.statesCount).toBe(4);
    expect(summary.transitionsCount).toBe(3);
  });

  it('should have the correct structure for StateDefinition', () => {
    const state: import('./workflow.model').StateDefinition = {
      code: 'created',
      name: 'CREATED',
      terminal: false,
    };
    expect(state.code).toBeDefined();
    expect(state.name).toBeDefined();
    expect(state.terminal).toBeDefined();
  });

  it('should have the correct structure for TransitionDefinition', () => {
    const transition: import('./workflow.model').TransitionDefinition = {
      from: 'created',
      to: 'in_review',
    };
    expect(transition.from).toBeDefined();
    expect(transition.to).toBeDefined();
  });

  it('should have the correct structure for WorkflowDetail', () => {
    const detail: import('./workflow.model').WorkflowDetail = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'test-workflow',
      states: [],
      transitions: [],
      initialState: 'created',
    };
    expect(detail.id).toBeDefined();
    expect(detail.name).toBeDefined();
    expect(detail.states).toBeDefined();
    expect(detail.transitions).toBeDefined();
    expect(detail.initialState).toBeDefined();
  });
});
