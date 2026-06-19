import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { WorkflowApiService } from './workflow-api.service';
import { WORKFLOW_ENGINE_CONFIG } from '../config/workflow-engine.config';
import { WorkflowSummary, WorkflowDetail } from '../models';

describe('WorkflowApiService', () => {
  let service: WorkflowApiService;
  let httpMock: HttpTestingController;
  const apiBaseUrl = 'http://localhost:8080';

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        WorkflowApiService,
        { provide: WORKFLOW_ENGINE_CONFIG, useValue: { apiBaseUrl } },
      ],
    });

    service = TestBed.inject(WorkflowApiService);
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
});
