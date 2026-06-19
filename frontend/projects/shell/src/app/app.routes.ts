import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./workflow-list-page.component').then(m => m.WorkflowListPageComponent),
    title: 'Workflows',
  },
  {
    path: 'workflows/:id',
    loadComponent: () => import('./workflow-detail-page.component').then(m => m.WorkflowDetailPageComponent),
    title: 'Workflow Detail',
  },
  {
    path: 'executions/:id',
    loadComponent: () => import('./execution-detail-page.component').then(m => m.ExecutionDetailPageComponent),
    title: 'Execution Detail',
  },
];
