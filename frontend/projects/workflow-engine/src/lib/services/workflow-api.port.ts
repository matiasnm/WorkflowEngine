import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { WorkflowSummary, WorkflowDetail, CreateWorkflowRequest, WorkflowEditability, UpdateWorkflowRequest } from '../models';

export abstract class WorkflowApiPort {
  abstract listWorkflows(): Observable<WorkflowSummary[]>;
  abstract getWorkflow(id: string): Observable<WorkflowDetail>;
  abstract createWorkflow(request: CreateWorkflowRequest): Observable<{ workflowId: string }>;
  abstract updateWorkflow(id: string, request: UpdateWorkflowRequest): Observable<{ workflowId: string }>;
  abstract deleteWorkflow(id: string): Observable<void>;
  abstract getWorkflowEditability(id: string): Observable<WorkflowEditability>;
}

export const WORKFLOW_API_PORT = new InjectionToken<WorkflowApiPort>('WORKFLOW_API_PORT');
