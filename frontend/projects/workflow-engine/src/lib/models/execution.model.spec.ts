describe('ExecutionModel', () => {
  it('should have the correct structure for ExecutionResponse', () => {
    const response: import('./execution.model').ExecutionResponse = {
      id: '123e4567-e89b-12d3-a456-426614174001',
      workflowId: '123e4567-e89b-12d3-a456-426614174000',
      currentState: { code: 'created', name: 'CREATED', terminal: false },
    };
    expect(response.id).toBeDefined();
    expect(response.workflowId).toBeDefined();
    expect(response.currentState).toBeDefined();
  });

  it('should accept optional context on ExecutionResponse', () => {
    const response: import('./execution.model').ExecutionResponse = {
      id: '1',
      workflowId: '2',
      currentState: { code: 'created', name: 'CREATED', terminal: false },
      context: { orderId: 'ORD-123', amount: 4500 },
    };
    expect(response.context).toEqual({ orderId: 'ORD-123', amount: 4500 });
  });

  it('should accept optional context on AllExecutionResponse', () => {
    const response: import('./execution.model').AllExecutionResponse = {
      id: '1',
      workflowId: '2',
      workflowName: 'test',
      currentState: { code: 'created', name: 'CREATED', terminal: false },
      context: { orderId: 'ORD-456' },
    };
    expect(response.context).toEqual({ orderId: 'ORD-456' });
  });

  it('should have the correct structure for TransitionResponse', () => {
    const response: import('./execution.model').TransitionResponse = {
      executionId: '123e4567-e89b-12d3-a456-426614174001',
      previousStateCode: 'created',
      previousStateName: 'CREATED',
      currentStateCode: 'in_review',
      currentStateName: 'IN_REVIEW',
      timestamp: '2026-06-19T12:00:00Z',
    };
    expect(response.executionId).toBeDefined();
    expect(response.previousStateCode).toBeDefined();
    expect(response.previousStateName).toBeDefined();
    expect(response.currentStateCode).toBeDefined();
    expect(response.currentStateName).toBeDefined();
    expect(response.timestamp).toBeDefined();
  });

  it('should have the correct structure for HistoryItem', () => {
    const item: import('./execution.model').HistoryItem = {
      fromStateCode: 'created',
      fromStateName: 'CREATED',
      toStateCode: 'in_review',
      toStateName: 'IN_REVIEW',
      timestamp: '2026-06-19T12:00:00Z',
    };
    expect(item.fromStateCode).toBeDefined();
    expect(item.fromStateName).toBeDefined();
    expect(item.toStateCode).toBeDefined();
    expect(item.toStateName).toBeDefined();
    expect(item.timestamp).toBeDefined();
  });

  it('should have the correct structure for NextStatesResponse', () => {
    const response: import('./execution.model').NextStatesResponse = {
      code: 'in_review',
      name: 'IN_REVIEW',
    };
    expect(response.code).toBeDefined();
    expect(response.name).toBeDefined();
  });
});
