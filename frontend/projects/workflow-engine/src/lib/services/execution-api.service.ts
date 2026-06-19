import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ExecutionResponse, TransitionResponse, HistoryItem, NextStatesResponse } from '../models';
import { WORKFLOW_ENGINE_CONFIG } from '../config/workflow-engine.config';

@Injectable({
  providedIn: 'root',
})
export class ExecutionApiService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(WORKFLOW_ENGINE_CONFIG);

  startExecution(workflowId: string): Observable<{ executionId: string }> {
    return this.http.post<{ executionId: string }>(
      `${this.config.apiBaseUrl}/workflows/${workflowId}/executions`,
      {}
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
}
