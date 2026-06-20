import { Provider } from '@angular/core';
import { provideWorkflowEngine, WORKFLOW_ENGINE_CONFIG, WorkflowEngineConfig } from './workflow-engine.config';
import { WORKFLOW_API_PORT } from '../services/workflow-api.port';
import { EXECUTION_API_PORT } from '../services/execution-api.port';

describe('WorkflowEngineConfig', () => {
  it('should provide the config via provideWorkflowEngine', () => {
    const config: WorkflowEngineConfig = { apiBaseUrl: 'http://localhost:8080' };
    const providers = provideWorkflowEngine(config);

    const configProvider = providers.find(
      (p: Provider) => (p as any).provide === WORKFLOW_ENGINE_CONFIG
    ) as any;
    expect(configProvider).toBeDefined();
    expect(configProvider.useValue).toEqual(config);
  });

  it('should provide WORKFLOW_API_PORT via HTTP adapter', () => {
    const config: WorkflowEngineConfig = { apiBaseUrl: 'http://localhost:8080' };
    const providers = provideWorkflowEngine(config);

    const portProvider = providers.find(
      (p: Provider) => (p as any).provide === WORKFLOW_API_PORT
    ) as any;
    expect(portProvider).toBeDefined();
    expect(portProvider.useClass?.name).toBe('WorkflowApiHttpAdapter');
  });

  it('should provide EXECUTION_API_PORT via HTTP adapter', () => {
    const config: WorkflowEngineConfig = { apiBaseUrl: 'http://localhost:8080' };
    const providers = provideWorkflowEngine(config);

    const portProvider = providers.find(
      (p: Provider) => (p as any).provide === EXECUTION_API_PORT
    ) as any;
    expect(portProvider).toBeDefined();
    expect(portProvider.useClass?.name).toBe('ExecutionApiHttpAdapter');
  });
});
