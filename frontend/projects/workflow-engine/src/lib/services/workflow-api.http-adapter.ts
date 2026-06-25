import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { WorkflowSummary, WorkflowDetail, CreateWorkflowRequest, UpdateWorkflowRequest, WorkflowEditability } from '../models';
import { WORKFLOW_ENGINE_CONFIG } from '../config/workflow-engine.config';
import { WorkflowApiPort } from './workflow-api.port';

@Injectable({
  providedIn: 'root',
})
export class WorkflowApiHttpAdapter implements WorkflowApiPort {
  private readonly http = inject(HttpClient);
  private readonly config = inject(WORKFLOW_ENGINE_CONFIG);

  listWorkflows(): Observable<WorkflowSummary[]> {
    return this.http.get<WorkflowSummary[]>(`${this.config.apiBaseUrl}/workflows`);
  }

  getWorkflow(id: string): Observable<WorkflowDetail> {
    return this.http.get<WorkflowDetail>(`${this.config.apiBaseUrl}/workflows/${id}`);
  }

  createWorkflow(request: CreateWorkflowRequest): Observable<{ workflowId: string }> {
    return this.http.post<{ workflowId: string }>(
      `${this.config.apiBaseUrl}/workflows`,
      request,
    );
  }

  updateWorkflow(id: string, request: UpdateWorkflowRequest): Observable<{ workflowId: string }> {
    return this.http.put<{ workflowId: string }>(
      `${this.config.apiBaseUrl}/workflows/${id}`,
      request,
    );
  }

  deleteWorkflow(id: string): Observable<void> {
    return this.http.delete<void>(`${this.config.apiBaseUrl}/workflows/${id}`);
  }

  getWorkflowEditability(id: string): Observable<WorkflowEditability> {
    return this.http.get<WorkflowEditability>(
      `${this.config.apiBaseUrl}/workflows/${id}/editable`,
    );
  }
}
