import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ExecutionResponse, TransitionResponse, HistoryItem, NextStatesResponse, Page, AllExecutionResponse } from '../models';
import { WORKFLOW_ENGINE_CONFIG } from '../config/workflow-engine.config';
import { ExecutionApiPort } from './execution-api.port';

@Injectable({
  providedIn: 'root',
})
export class ExecutionApiHttpAdapter implements ExecutionApiPort {
  private readonly http = inject(HttpClient);
  private readonly config = inject(WORKFLOW_ENGINE_CONFIG);

  startExecution(workflowId: string, context?: Record<string, unknown>): Observable<{ executionId: string }> {
    const body: Record<string, unknown> = {};
    if (context !== undefined && context !== null) {
      body['context'] = context;
    }
    return this.http.post<{ executionId: string }>(
      `${this.config.apiBaseUrl}/workflows/${workflowId}/executions`,
      body
    );
  }

  getExecution(id: string): Observable<ExecutionResponse> {
    return this.http.get<ExecutionResponse>(`${this.config.apiBaseUrl}/executions/${id}`);
  }

  transition(executionId: string, targetStateCode: string): Observable<TransitionResponse> {
    return this.http.post<TransitionResponse>(
      `${this.config.apiBaseUrl}/executions/${executionId}/transition`,
      { targetStateCode }
    );
  }

  getNextStates(executionId: string): Observable<NextStatesResponse[]> {
    return this.http.get<NextStatesResponse[]>(
      `${this.config.apiBaseUrl}/executions/${executionId}/next-states`
    );
  }

  getHistory(executionId: string): Observable<HistoryItem[]> {
    return this.http.get<HistoryItem[]>(
      `${this.config.apiBaseUrl}/executions/${executionId}/history`
    );
  }

  listExecutions(workflowId: string, page = 0, size = 20): Observable<Page<ExecutionResponse>> {
    return this.http.get<Page<ExecutionResponse>>(
      `${this.config.apiBaseUrl}/workflows/${workflowId}/executions`,
      { params: { page: String(page), size: String(size) } }
    );
  }

  listAllExecutions(): Observable<AllExecutionResponse[]> {
    return this.http.get<AllExecutionResponse[]>(`${this.config.apiBaseUrl}/executions`);
  }

  deleteExecution(id: string): Observable<void> {
    return this.http.delete<void>(`${this.config.apiBaseUrl}/executions/${id}`);
  }
}
