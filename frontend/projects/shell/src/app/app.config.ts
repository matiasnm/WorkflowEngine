import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideWorkflowEngine } from 'workflow-engine';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptorsFromDi()),
    provideWorkflowEngine({
      apiBaseUrl: 'http://localhost:8080',
      apiKey: 'sk-dev-localonly-changeme',     // TODO: read from environment in production
    }),
  ]
};
