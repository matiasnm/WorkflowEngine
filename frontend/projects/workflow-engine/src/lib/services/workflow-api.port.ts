import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { WorkflowSummary, WorkflowDetail, CreateWorkflowRequest } from '../models';

export abstract class WorkflowApiPort {
  abstract listWorkflows(): Observable<WorkflowSummary[]>;
  abstract getWorkflow(id: string): Observable<WorkflowDetail>;
  abstract createWorkflow(request: CreateWorkflowRequest): Observable<{ workflowId: string }>;
}

export const WORKFLOW_API_PORT = new InjectionToken<WorkflowApiPort>('WORKFLOW_API_PORT');
