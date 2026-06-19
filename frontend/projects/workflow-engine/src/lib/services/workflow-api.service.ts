import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { WorkflowSummary, WorkflowDetail } from '../models';
import { WORKFLOW_ENGINE_CONFIG } from '../config/workflow-engine.config';

@Injectable({
  providedIn: 'root',
})
export class WorkflowApiService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(WORKFLOW_ENGINE_CONFIG);

  listWorkflows(): Observable<WorkflowSummary[]> {
    return this.http.get<WorkflowSummary[]>(`${this.config.apiBaseUrl}/workflows`);
  }

  getWorkflow(id: string): Observable<WorkflowDetail> {
    return this.http.get<WorkflowDetail>(`${this.config.apiBaseUrl}/workflows/${id}`);
  }
}
