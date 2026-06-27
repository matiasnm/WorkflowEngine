import { InjectionToken, Provider } from '@angular/core';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { WORKFLOW_API_PORT } from '../services/workflow-api.port';
import { WorkflowApiHttpAdapter } from '../services/workflow-api.http-adapter';
import { EXECUTION_API_PORT } from '../services/execution-api.port';
import { ExecutionApiHttpAdapter } from '../services/execution-api.http-adapter';
import { ApiKeyInterceptor } from '../interceptors/api-key.interceptor';

export interface WorkflowEngineConfig {
  apiBaseUrl: string;
  apiKey?: string;
}

export const WORKFLOW_ENGINE_CONFIG = new InjectionToken<WorkflowEngineConfig>(
  'WORKFLOW_ENGINE_CONFIG'
);

/**
 * Provider factory for the WorkflowEngine configuration.
 * Call `provideWorkflowEngine({ apiBaseUrl: 'http://localhost:8080' })` in the host app's providers.
 */
export function provideWorkflowEngine(config: WorkflowEngineConfig): Provider[] {
  return [
    { provide: WORKFLOW_ENGINE_CONFIG, useValue: config },
    { provide: WORKFLOW_API_PORT, useClass: WorkflowApiHttpAdapter },
    { provide: EXECUTION_API_PORT, useClass: ExecutionApiHttpAdapter },
    { provide: HTTP_INTERCEPTORS, useClass: ApiKeyInterceptor, multi: true },
  ];
}
