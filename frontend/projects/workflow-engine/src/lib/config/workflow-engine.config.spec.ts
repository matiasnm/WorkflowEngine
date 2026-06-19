import { Provider } from '@angular/core';
import { provideWorkflowEngine, WORKFLOW_ENGINE_CONFIG, WorkflowEngineConfig } from './workflow-engine.config';

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
});
