import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./workflow-list-page.component').then(m => m.WorkflowListPageComponent),
    title: 'Workflows',
  },
  {
    path: 'workflows/new',
    loadComponent: () => import('./workflow-create-page.component').then(m => m.WorkflowCreatePageComponent),
    title: 'Create Workflow',
  },
  {
    path: 'workflows/:id/edit',
    loadComponent: () => import('./workflow-edit-page.component').then(m => m.WorkflowEditPageComponent),
    title: 'Edit Workflow',
  },
  {
    path: 'workflows/:id',
    loadComponent: () => import('./workflow-detail-page.component').then(m => m.WorkflowDetailPageComponent),
    title: 'Workflow Detail',
  },
  {
    path: 'executions',
    loadComponent: () => import('./executions-page.component').then(m => m.ExecutionsPageComponent),
    title: 'Executions',
  },
  {
    path: 'executions/:id',
    loadComponent: () => import('./execution-detail-page.component').then(m => m.ExecutionDetailPageComponent),
    title: 'Execution Detail',
  },
];
