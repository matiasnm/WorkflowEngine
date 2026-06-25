import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { ExecutionResponse, TransitionResponse, HistoryItem, NextStatesResponse, AllExecutionResponse } from '../models';

export abstract class ExecutionApiPort {
  abstract startExecution(workflowId: string): Observable<{ executionId: string }>;
  abstract getExecution(id: string): Observable<ExecutionResponse>;
  abstract transition(executionId: string, targetStateCode: string): Observable<TransitionResponse>;
  abstract getNextStates(executionId: string): Observable<NextStatesResponse[]>;
  abstract getHistory(executionId: string): Observable<HistoryItem[]>;
  abstract listExecutions(workflowId: string): Observable<ExecutionResponse[]>;
  abstract listAllExecutions(): Observable<AllExecutionResponse[]>;
  abstract deleteExecution(id: string): Observable<void>;
}

export const EXECUTION_API_PORT = new InjectionToken<ExecutionApiPort>('EXECUTION_API_PORT');
