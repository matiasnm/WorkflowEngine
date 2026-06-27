import { TestBed } from '@angular/core/testing';
import { ExecutionApiFakeAdapter } from './execution-api.fake-adapter';

describe('ExecutionApiFakeAdapter', () => {
  let adapter: ExecutionApiFakeAdapter;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ExecutionApiFakeAdapter],
    });
    adapter = TestBed.inject(ExecutionApiFakeAdapter);
    // Always start with a clean state
    adapter.reset();
  });

  describe('listExecutions()', () => {
    it('should return paginated page with default seeded executions', (done) => {
      const workflowId = 'd290f1ee-6c54-4b01-90e6-d701748f0851';
      adapter.listExecutions(workflowId).subscribe((page) => {
        expect(page.content.length).toBe(2);
        expect(page.content[0].workflowId).toBe(workflowId);
        expect(page.content[1].workflowId).toBe(workflowId);
        expect(page.page).toBe(0);
        expect(page.totalElements).toBe(2);
        expect(page.totalPages).toBe(1);
        done();
      });
    });

    it('should return empty content for unknown workflow', (done) => {
      adapter.listExecutions('unknown-workflow').subscribe((page) => {
        expect(page.content).toEqual([]);
        expect(page.totalElements).toBe(0);
        expect(page.totalPages).toBe(0);
        done();
      });
    });

    it('should respect page and size parameters', (done) => {
      const workflowId = 'd290f1ee-6c54-4b01-90e6-d701748f0851';
      // Page 0, size 1 — should return only the first execution
      adapter.listExecutions(workflowId, 0, 1).subscribe((page) => {
        expect(page.content.length).toBe(1);
        expect(page.totalElements).toBe(2);
        expect(page.totalPages).toBe(2);
        expect(page.page).toBe(0);
        done();
      });
    });
  });

  describe('getExecution()', () => {
    it('should return a known execution', (done) => {
      const execId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
      adapter.getExecution(execId).subscribe((execution) => {
        expect(execution.id).toBe(execId);
        expect(execution.currentState.code).toBe('in_review');
        done();
      });
    });

    it('should throw an error for an unknown execution', (done) => {
      adapter.getExecution('unknown-exec').subscribe({
        next: () => fail('Expected an error'),
        error: (err: Error) => {
          expect(err.message).toContain('not found');
          done();
        },
      });
    });
  });

  describe('startExecution()', () => {
    it('should create a new execution and return its id', (done) => {
      const workflowId = 'd290f1ee-6c54-4b01-90e6-d701748f0851';

      adapter.startExecution(workflowId).subscribe((response) => {
        expect(response.executionId).toBeTruthy();
        expect(typeof response.executionId).toBe('string');

        // Verify it was stored
        adapter.getExecution(response.executionId).subscribe((execution) => {
          expect(execution.workflowId).toBe(workflowId);
          expect(execution.currentState.code).toBe('pending');
          expect(execution.currentStateSince).toBeTruthy();
          done();
        });
      });
    });

    it('should store context on the execution when provided', (done) => {
      const workflowId = 'd290f1ee-6c54-4b01-90e6-d701748f0851';
      const context = { orderId: 'ORD-123', amount: 4500 };

      adapter.startExecution(workflowId, context).subscribe((response) => {
        adapter.getExecution(response.executionId).subscribe((execution) => {
          expect(execution.context).toEqual(context);
          done();
        });
      });
    });

    it('should omit context when not provided', (done) => {
      const workflowId = 'd290f1ee-6c54-4b01-90e6-d701748f0851';

      adapter.startExecution(workflowId).subscribe((response) => {
        adapter.getExecution(response.executionId).subscribe((execution) => {
          expect(execution.context).toBeUndefined();
          done();
        });
      });
    });

    it('should add the execution to the workflow list', (done) => {
      const workflowId = 'd290f1ee-6c54-4b01-90e6-d701748f0851';

      adapter.startExecution(workflowId).subscribe((response) => {
        adapter.listExecutions(workflowId).subscribe((page) => {
          const created = page.content.find((e) => e.id === response.executionId);
          expect(created).toBeTruthy();
          done();
        });
      });
    });
  });

  describe('transition()', () => {
    it('should perform a valid transition', (done) => {
      const execId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

      adapter.transition(execId, 'approved').subscribe((response) => {
        expect(response.executionId).toBe(execId);
        expect(response.previousStateCode).toBe('in_review');
        expect(response.currentStateCode).toBe('approved');
        expect(response.timestamp).toBeTruthy();

        // Verify execution was updated
        adapter.getExecution(execId).subscribe((execution) => {
          expect(execution.currentState.code).toBe('approved');
          expect(execution.currentState.name).toBe('APPROVED');
          expect(execution.currentState.terminal).toBeTrue();
          done();
        });
      });
    });

    it('should reject transition from a terminal state (after transition to approved)', (done) => {
      const execId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

      adapter.transition(execId, 'approved').subscribe({
        next: () => {
          // Now try to transition again from terminal state
          adapter.transition(execId, 'rejected').subscribe({
            next: () => fail('Expected an error'),
            error: (err: Error) => {
              expect(err.message).toContain('terminal');
              done();
            },
          });
        },
        error: () => fail('First transition should have succeeded'),
      });
    });

    it('should reject an invalid transition', (done) => {
      const execId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

      adapter.transition(execId, 'delivered').subscribe({
        next: () => fail('Expected an error'),
        error: (err: Error) => {
          expect(err.message).toContain('Invalid transition');
          done();
        },
      });
    });

    it('should reject transition for unknown execution', (done) => {
      adapter.transition('unknown-exec', 'approved').subscribe({
        next: () => fail('Expected an error'),
        error: (err: Error) => {
          expect(err.message).toContain('not found');
          done();
        },
      });
    });
  });

  describe('getNextStates()', () => {
    it('should return valid next states for in_review', (done) => {
      const execId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

      adapter.getNextStates(execId).subscribe((states) => {
        expect(states.length).toBe(2);
        const codes = states.map((s) => s.code);
        expect(codes).toContain('approved');
        expect(codes).toContain('rejected');
        done();
      });
    });

    it('should return empty array for terminal state', (done) => {
      const execId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

      // First transition to terminal state
      adapter.transition(execId, 'approved').subscribe(() => {
        adapter.getNextStates(execId).subscribe((states) => {
          expect(states).toEqual([]);
          done();
        });
      });
    });

    it('should throw error for unknown execution', (done) => {
      adapter.getNextStates('unknown-exec').subscribe({
        next: () => fail('Expected an error'),
        error: (err: Error) => {
          expect(err.message).toContain('not found');
          done();
        },
      });
    });
  });

  describe('getHistory()', () => {
    it('should return default history for a known execution', (done) => {
      const execId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

      adapter.getHistory(execId).subscribe((history) => {
        expect(history.length).toBe(1);
        expect(history[0].fromStateCode).toBe('created');
        expect(history[0].toStateCode).toBe('in_review');
        done();
      });
    });

    it('should return empty array for execution with no history', (done) => {
      const execId = 'b2c3d4e5-f6a7-8901-bcde-f12345678901';

      adapter.getHistory(execId).subscribe((history) => {
        expect(history).toEqual([]);
        done();
      });
    });

    it('should return empty array for unknown execution', (done) => {
      adapter.getHistory('unknown-exec').subscribe((history) => {
        expect(history).toEqual([]);
        done();
      });
    });

    it('should record history after a transition', (done) => {
      const execId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

      adapter.transition(execId, 'approved').subscribe(() => {
        adapter.getHistory(execId).subscribe((history) => {
          expect(history.length).toBe(2);
          expect(history[1].fromStateCode).toBe('in_review');
          expect(history[1].toStateCode).toBe('approved');
          done();
        });
      });
    });
  });

  describe('reset()', () => {
    it('should restore default data after mutations', (done) => {
      const execId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

      // Perform a transition
      adapter.transition(execId, 'approved').subscribe(() => {
        // Verify the state changed
        adapter.getExecution(execId).subscribe((exec) => {
          expect(exec.currentState.code).toBe('approved');

          // Reset
          adapter.reset();

          // Verify state is restored
          adapter.getExecution(execId).subscribe((restored) => {
            expect(restored.currentState.code).toBe('in_review');
            expect(restored.currentState.terminal).toBeFalse();
            done();
          });
        });
      });
    });

    it('should restore default history after reset', (done) => {
      const execId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

      adapter.transition(execId, 'approved').subscribe(() => {
        adapter.reset();

        adapter.getHistory(execId).subscribe((history) => {
          expect(history.length).toBe(1);
          expect(history[0].toStateCode).toBe('in_review');
          done();
        });
      });
    });
  });
});
