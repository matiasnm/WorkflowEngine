import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { WorkflowApiHttpAdapter } from './workflow-api.http-adapter';
import { WORKFLOW_ENGINE_CONFIG } from '../config/workflow-engine.config';
import { WorkflowSummary, WorkflowDetail, CreateWorkflowRequest, UpdateWorkflowRequest, WorkflowEditability } from '../models';

describe('WorkflowApiHttpAdapter', () => {
  let service: WorkflowApiHttpAdapter;
  let httpMock: HttpTestingController;
  const apiBaseUrl = 'http://localhost:8080';

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        WorkflowApiHttpAdapter,
        { provide: WORKFLOW_ENGINE_CONFIG, useValue: { apiBaseUrl } },
      ],
    });

    service = TestBed.inject(WorkflowApiHttpAdapter);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('listWorkflows()', () => {
    it('should call GET /workflows and return WorkflowSummary[]', () => {
      const mockWorkflows: WorkflowSummary[] = [
        { id: 'uuid-1', name: 'simple-approval', statesCount: 4, transitionsCount: 3 },
        { id: 'uuid-2', name: 'order-fulfillment', statesCount: 5, transitionsCount: 6 },
      ];

      service.listWorkflows().subscribe((workflows) => {
        expect(workflows).toEqual(mockWorkflows);
        expect(workflows.length).toBe(2);
      });

      const req = httpMock.expectOne(`${apiBaseUrl}/workflows`);
      expect(req.request.method).toBe('GET');
      req.flush(mockWorkflows);
    });

    it('should return an empty array when no workflows exist', () => {
      service.listWorkflows().subscribe((workflows) => {
        expect(workflows).toEqual([]);
        expect(workflows.length).toBe(0);
      });

      const req = httpMock.expectOne(`${apiBaseUrl}/workflows`);
      expect(req.request.method).toBe('GET');
      req.flush([]);
    });

    it('should propagate HTTP errors', () => {
      const errorMessage = 'Internal Server Error';

      service.listWorkflows().subscribe({
        next: () => fail('Expected an error, not a response'),
        error: (error) => {
          expect(error.status).toBe(500);
          expect(error.statusText).toBe(errorMessage);
        },
      });

      const req = httpMock.expectOne(`${apiBaseUrl}/workflows`);
      expect(req.request.method).toBe('GET');
      req.flush(null, { status: 500, statusText: errorMessage });
    });
  });

  describe('createWorkflow()', () => {
    it('should call POST /workflows with correct request body', () => {
      const request: CreateWorkflowRequest = {
        name: 'simple-approval',
        states: [
          { code: 'created', name: 'CREATED', terminal: false },
          { code: 'approved', name: 'APPROVED', terminal: true },
        ],
        transitions: [
          { from: 'created', to: 'approved' },
        ],
        initialState: 'created',
      };

      service.createWorkflow(request).subscribe((response) => {
        expect(response.workflowId).toBe('new-uuid');
      });

      const req = httpMock.expectOne(`${apiBaseUrl}/workflows`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(request);
      req.flush({ workflowId: 'new-uuid' });
    });

    it('should propagate HTTP errors from the API', () => {
      const request: CreateWorkflowRequest = {
        name: 'test',
        states: [
          { code: 'a', name: 'A', terminal: false },
          { code: 'b', name: 'B', terminal: false },
        ],
        transitions: [],
        initialState: 'a',
      };

      service.createWorkflow(request).subscribe({
        next: () => fail('Expected an error, not a response'),
        error: (error) => {
          expect(error.status).toBe(400);
        },
      });

      const req = httpMock.expectOne(`${apiBaseUrl}/workflows`);
      expect(req.request.method).toBe('POST');
      req.flush({ message: 'name: must not be blank' }, { status: 400, statusText: 'Bad Request' });
    });
  });

  describe('getWorkflow()', () => {
    it('should call GET /workflows/{id} and return WorkflowDetail', () => {
      const mockDetail: WorkflowDetail = {
        id: 'uuid-1',
        name: 'simple-approval',
        states: [
          { code: 'created', name: 'CREATED', terminal: false },
          { code: 'approved', name: 'APPROVED', terminal: true },
        ],
        transitions: [
          { from: 'created', to: 'approved' },
        ],
        initialState: 'created',
      };

      service.getWorkflow('uuid-1').subscribe((detail) => {
        expect(detail).toEqual(mockDetail);
        expect(detail.id).toBe('uuid-1');
      });

      const req = httpMock.expectOne(`${apiBaseUrl}/workflows/uuid-1`);
      expect(req.request.method).toBe('GET');
      req.flush(mockDetail);
    });

    it('should propagate 404 error when workflow is not found', () => {
      service.getWorkflow('non-existent').subscribe({
        next: () => fail('Expected an error, not a response'),
        error: (error) => {
          expect(error.status).toBe(404);
        },
      });

      const req = httpMock.expectOne(`${apiBaseUrl}/workflows/non-existent`);
      expect(req.request.method).toBe('GET');
      req.flush(null, { status: 404, statusText: 'Not Found' });
    });
  });

  describe('updateWorkflow()', () => {
    it('should call PUT /workflows/{id} with correct request body', () => {
      const request: UpdateWorkflowRequest = {
        name: 'updated-workflow',
        states: [
          { code: 'created', name: 'CREATED', terminal: false },
          { code: 'approved', name: 'APPROVED', terminal: true },
        ],
        transitions: [
          { from: 'created', to: 'approved' },
        ],
        initialState: 'created',
      };

      service.updateWorkflow('uuid-1', request).subscribe((response) => {
        expect(response.workflowId).toBe('uuid-1');
      });

      const req = httpMock.expectOne(`${apiBaseUrl}/workflows/uuid-1`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(request);
      req.flush({ workflowId: 'uuid-1' });
    });

    it('should propagate HTTP errors', () => {
      const request: UpdateWorkflowRequest = {
        name: 'test',
        states: [
          { code: 'a', name: 'A', terminal: false },
          { code: 'b', name: 'B', terminal: false },
        ],
        transitions: [],
        initialState: 'a',
      };

      service.updateWorkflow('uuid-1', request).subscribe({
        next: () => fail('Expected an error, not a response'),
        error: (error) => {
          expect(error.status).toBe(409);
        },
      });

      const req = httpMock.expectOne(`${apiBaseUrl}/workflows/uuid-1`);
      expect(req.request.method).toBe('PUT');
      req.flush(
        { detail: 'Cannot update workflow', violations: ['state X has executions'] },
        { status: 409, statusText: 'Conflict' },
      );
    });
  });

  describe('getWorkflowEditability()', () => {
    it('should call GET /workflows/{id}/editable and return WorkflowEditability', () => {
      const mockResponse: WorkflowEditability = {
        workflowId: 'uuid-1',
        hasExecutions: true,
        executionCount: 3,
        restrictions: {
          renameableStates: ['created', 'in_review'],
          lockedStates: ['approved', 'rejected'],
          lockedReason: 'Referenced by 3 execution(s)',
          canChangeTerminal: false,
          canRemoveStates: false,
          canRenameWorkflow: true,
          canAddStates: true,
          canChangeInitialState: true,
          canAddTransitions: true,
          canRemoveTransitions: true,
        },
      };

      service.getWorkflowEditability('uuid-1').subscribe((result) => {
        expect(result).toEqual(mockResponse);
        expect(result.workflowId).toBe('uuid-1');
        expect(result.restrictions.lockedStates).toEqual(['approved', 'rejected']);
      });

      const req = httpMock.expectOne(`${apiBaseUrl}/workflows/uuid-1/editable`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should propagate 404 error when workflow is not found', () => {
      service.getWorkflowEditability('non-existent').subscribe({
        next: () => fail('Expected an error, not a response'),
        error: (error) => {
          expect(error.status).toBe(404);
        },
      });

      const req = httpMock.expectOne(`${apiBaseUrl}/workflows/non-existent/editable`);
      expect(req.request.method).toBe('GET');
      req.flush(null, { status: 404, statusText: 'Not Found' });
    });
  });
});
