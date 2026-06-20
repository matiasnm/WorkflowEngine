import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ExecutionApiService } from './execution-api.service';
import { WORKFLOW_ENGINE_CONFIG } from '../config/workflow-engine.config';
import { ExecutionResponse, TransitionResponse, HistoryItem, NextStatesResponse, ExecutionPageResponse } from '../models';

describe('ExecutionApiService', () => {
  let service: ExecutionApiService;
  let httpMock: HttpTestingController;
  const apiBaseUrl = 'http://localhost:8080';

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        ExecutionApiService,
        { provide: WORKFLOW_ENGINE_CONFIG, useValue: { apiBaseUrl } },
      ],
    });

    service = TestBed.inject(ExecutionApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('startExecution()', () => {
    it('should call POST /workflows/{id}/executions and return executionId', () => {
      const workflowId = 'uuid-1';
      const mockResponse = { executionId: 'exec-uuid-1' };

      service.startExecution(workflowId).subscribe((response) => {
        expect(response).toEqual(mockResponse);
        expect(response.executionId).toBe('exec-uuid-1');
      });

      const req = httpMock.expectOne(`${apiBaseUrl}/workflows/${workflowId}/executions`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({});
      req.flush(mockResponse);
    });

    it('should propagate HTTP errors', () => {
      const workflowId = 'uuid-1';

      service.startExecution(workflowId).subscribe({
        next: () => fail('Expected an error, not a response'),
        error: (error) => {
          expect(error.status).toBe(500);
        },
      });

      const req = httpMock.expectOne(`${apiBaseUrl}/workflows/${workflowId}/executions`);
      expect(req.request.method).toBe('POST');
      req.flush(null, { status: 500, statusText: 'Internal Server Error' });
    });
  });

  describe('getExecution()', () => {
    it('should call GET /executions/{id} and return ExecutionResponse', () => {
      const executionId = 'exec-uuid-1';
      const mockResponse: ExecutionResponse = {
        id: executionId,
        workflowId: 'uuid-1',
        currentState: { code: 'created', name: 'CREATED', terminal: false },
      };

      service.getExecution(executionId).subscribe((response) => {
        expect(response).toEqual(mockResponse);
        expect(response.id).toBe(executionId);
      });

      const req = httpMock.expectOne(`${apiBaseUrl}/executions/${executionId}`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should propagate 404 error when execution is not found', () => {
      const executionId = 'non-existent';

      service.getExecution(executionId).subscribe({
        next: () => fail('Expected an error, not a response'),
        error: (error) => {
          expect(error.status).toBe(404);
        },
      });

      const req = httpMock.expectOne(`${apiBaseUrl}/executions/${executionId}`);
      expect(req.request.method).toBe('GET');
      req.flush(null, { status: 404, statusText: 'Not Found' });
    });
  });

  describe('transition()', () => {
    it('should call POST /executions/{id}/transition and return TransitionResponse', () => {
      const executionId = 'exec-uuid-1';
      const targetStateCode = 'approved';
      const mockResponse: TransitionResponse = {
        executionId,
        previousStateCode: 'created',
        previousStateName: 'CREATED',
        currentStateCode: 'approved',
        currentStateName: 'APPROVED',
        timestamp: '2026-06-19T12:00:00Z',
      };

      service.transition(executionId, targetStateCode).subscribe((response) => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${apiBaseUrl}/executions/${executionId}/transition`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ targetStateCode });
      req.flush(mockResponse);
    });

    it('should propagate HTTP errors', () => {
      const executionId = 'exec-uuid-1';
      const targetStateCode = 'invalid';

      service.transition(executionId, targetStateCode).subscribe({
        next: () => fail('Expected an error, not a response'),
        error: (error) => {
          expect(error.status).toBe(400);
        },
      });

      const req = httpMock.expectOne(`${apiBaseUrl}/executions/${executionId}/transition`);
      expect(req.request.method).toBe('POST');
      req.flush(null, { status: 400, statusText: 'Bad Request' });
    });
  });

  describe('getNextStates()', () => {
    it('should call GET /executions/{id}/next-states and return NextStatesResponse[]', () => {
      const executionId = 'exec-uuid-1';
      const mockResponse: NextStatesResponse[] = [
        { code: 'approved', name: 'APPROVED' },
        { code: 'rejected', name: 'REJECTED' },
      ];

      service.getNextStates(executionId).subscribe((response) => {
        expect(response).toEqual(mockResponse);
        expect(response.length).toBe(2);
      });

      const req = httpMock.expectOne(`${apiBaseUrl}/executions/${executionId}/next-states`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should return an empty array when no next states', () => {
      const executionId = 'exec-uuid-1';

      service.getNextStates(executionId).subscribe((response) => {
        expect(response).toEqual([]);
      });

      const req = httpMock.expectOne(`${apiBaseUrl}/executions/${executionId}/next-states`);
      expect(req.request.method).toBe('GET');
      req.flush([]);
    });
  });

  describe('listExecutions()', () => {
    const mockExecutions: ExecutionResponse[] = [
      {
        id: 'exec-uuid-1',
        workflowId: 'wf-uuid-1',
        currentState: { code: 'created', name: 'CREATED', terminal: false },
        currentStateSince: '2026-06-19T10:00:00Z',
      },
      {
        id: 'exec-uuid-2',
        workflowId: 'wf-uuid-1',
        currentState: { code: 'in_review', name: 'IN_REVIEW', terminal: false },
        currentStateSince: '2026-06-19T10:05:00Z',
      },
    ];

    it('should call GET /workflows/{id}/executions and return ExecutionResponse[] from page content', () => {
      const workflowId = 'wf-uuid-1';
      const mockPageResponse: ExecutionPageResponse = {
        content: mockExecutions,
        page: 0,
        size: 20,
        totalElements: 2,
        totalPages: 1,
      };

      service.listExecutions(workflowId).subscribe((response) => {
        expect(response).toEqual(mockExecutions);
        expect(response.length).toBe(2);
      });

      const req = httpMock.expectOne(`${apiBaseUrl}/workflows/${workflowId}/executions`);
      expect(req.request.method).toBe('GET');
      req.flush(mockPageResponse);
    });

    it('should return an empty array when no executions exist', () => {
      const workflowId = 'wf-uuid-1';
      const emptyPage: ExecutionPageResponse = {
        content: [],
        page: 0,
        size: 20,
        totalElements: 0,
        totalPages: 0,
      };

      service.listExecutions(workflowId).subscribe((response) => {
        expect(response).toEqual([]);
      });

      const req = httpMock.expectOne(`${apiBaseUrl}/workflows/${workflowId}/executions`);
      expect(req.request.method).toBe('GET');
      req.flush(emptyPage);
    });
  });

  describe('getHistory()', () => {
    it('should call GET /executions/{id}/history and return HistoryItem[]', () => {
      const executionId = 'exec-uuid-1';
      const mockResponse: HistoryItem[] = [
        {
          fromStateCode: 'created',
          fromStateName: 'CREATED',
          toStateCode: 'in_review',
          toStateName: 'IN_REVIEW',
          timestamp: '2026-06-19T12:00:00Z',
        },
      ];

      service.getHistory(executionId).subscribe((response) => {
        expect(response).toEqual(mockResponse);
        expect(response.length).toBe(1);
      });

      const req = httpMock.expectOne(`${apiBaseUrl}/executions/${executionId}/history`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });
});
