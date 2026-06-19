import { Injectable, InjectionToken, Provider, inject } from '@angular/core';

export interface WorkflowEngineConfig {
  apiBaseUrl: string;
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
  ];
}
