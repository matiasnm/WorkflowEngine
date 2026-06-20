import { TestBed } from '@angular/core/testing';
import { WorkflowApiFakeAdapter } from './workflow-api.fake-adapter';
import { CreateWorkflowRequest } from '../models';

describe('WorkflowApiFakeAdapter', () => {
  let adapter: WorkflowApiFakeAdapter;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [WorkflowApiFakeAdapter],
    });
    adapter = TestBed.inject(WorkflowApiFakeAdapter);
  });

  describe('listWorkflows()', () => {
    it('should return default seeded workflows', (done) => {
      adapter.listWorkflows().subscribe((workflows) => {
        expect(workflows.length).toBe(2);
        expect(workflows[0].name).toBe('simple-approval');
        expect(workflows[1].name).toBe('order-fulfillment');
        done();
      });
    });

    it('should reflect newly created workflows', (done) => {
      adapter.listWorkflows().subscribe((before) => {
        const countBefore = before.length;

        adapter.createWorkflow({
          name: 'new-wf',
          states: [
            { code: 'a', name: 'A', terminal: false },
            { code: 'b', name: 'B', terminal: true },
          ],
          transitions: [{ from: 'a', to: 'b' }],
          initialState: 'a',
        }).subscribe(() => {
          adapter.listWorkflows().subscribe((after) => {
            expect(after.length).toBe(countBefore + 1);
            expect(after[countBefore].name).toBe('new-wf');
            done();
          });
        });
      });
    });
  });

  describe('getWorkflow()', () => {
    it('should return a known workflow detail by id', (done) => {
      const knownId = 'd290f1ee-6c54-4b01-90e6-d701748f0851';
      adapter.getWorkflow(knownId).subscribe((detail) => {
        expect(detail.id).toBe(knownId);
        expect(detail.name).toBe('simple-approval');
        expect(detail.states.length).toBe(4);
        expect(detail.transitions.length).toBe(3);
        expect(detail.initialState).toBe('created');
        done();
      });
    });

    it('should return the second default workflow', (done) => {
      const knownId = 'e390f2ee-7d65-4c02-91f7-e812749f0962';
      adapter.getWorkflow(knownId).subscribe((detail) => {
        expect(detail.id).toBe(knownId);
        expect(detail.name).toBe('order-fulfillment');
        expect(detail.states.length).toBe(5);
        done();
      });
    });

    it('should throw an error for an unknown workflow id', (done) => {
      adapter.getWorkflow('unknown-id').subscribe({
        next: () => fail('Expected an error'),
        error: (err: Error) => {
          expect(err.message).toContain('not found');
          done();
        },
      });
    });
  });

  describe('createWorkflow()', () => {
    const request: CreateWorkflowRequest = {
      name: 'test-workflow',
      states: [
        { code: 'alpha', name: 'Alpha', terminal: false },
        { code: 'omega', name: 'Omega', terminal: true },
      ],
      transitions: [{ from: 'alpha', to: 'omega' }],
      initialState: 'alpha',
    };

    it('should return a new workflow id', (done) => {
      adapter.createWorkflow(request).subscribe((response) => {
        expect(response.workflowId).toBeTruthy();
        expect(typeof response.workflowId).toBe('string');
        done();
      });
    });

    it('should store the workflow detail that can be retrieved', (done) => {
      adapter.createWorkflow(request).subscribe((response) => {
        adapter.getWorkflow(response.workflowId).subscribe((detail) => {
          expect(detail.name).toBe('test-workflow');
          expect(detail.states).toEqual(request.states);
          expect(detail.transitions).toEqual(request.transitions);
          expect(detail.initialState).toBe('alpha');
          done();
        });
      });
    });

    it('should add a summary entry to the list', (done) => {
      adapter.createWorkflow(request).subscribe((response) => {
        adapter.listWorkflows().subscribe((workflows) => {
          const created = workflows.find((w) => w.id === response.workflowId);
          expect(created).toBeTruthy();
          expect(created!.name).toBe('test-workflow');
          expect(created!.statesCount).toBe(2);
          expect(created!.transitionsCount).toBe(1);
          done();
        });
      });
    });
  });

  describe('reset()', () => {
    it('should restore default data after mutation', (done) => {
      adapter.createWorkflow({
        name: 'temp',
        states: [
          { code: 'x', name: 'X', terminal: false },
          { code: 'y', name: 'Y', terminal: true },
        ],
        transitions: [],
        initialState: 'x',
      }).subscribe(() => {
        // Verify data was mutated (3 workflows now)
        expect(adapter.workflows.length).toBe(3);

        adapter.reset();

        adapter.listWorkflows().subscribe((workflows) => {
          expect(workflows.length).toBe(2);
          expect(workflows[0].name).toBe('simple-approval');
          done();
        });
      });
    });
  });
});
