import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { WorkflowEditPageComponent } from './workflow-edit-page.component';
import { WORKFLOW_API_PORT } from 'workflow-engine';
import { of } from 'rxjs';

describe('WorkflowEditPageComponent', () => {
  let component: WorkflowEditPageComponent;
  let fixture: ComponentFixture<WorkflowEditPageComponent>;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkflowEditPageComponent],
      providers: [
        provideRouter([
          { path: 'workflows/:id/edit', component: WorkflowEditPageComponent },
        ]),
        {
          provide: WORKFLOW_API_PORT,
          useValue: {
            getWorkflow: () => of({ id: 'wf-1', name: 'test', states: [], transitions: [], initialState: '' }),
            getWorkflowEditability: () => of({ workflowId: 'wf-1', hasExecutions: false, executionCount: 0, restrictions: {} }),
            updateWorkflow: () => of({ workflowId: 'wf-1' }),
          },
        },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(WorkflowEditPageComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render we-workflow-edit component', () => {
    fixture.detectChanges();
    const el = fixture.nativeElement.querySelector('we-workflow-edit');
    expect(el).toBeTruthy();
  });

  it('should navigate to /workflows/:id on workflowUpdated with from=edit state', () => {
    const navigateSpy = spyOn(router, 'navigate');
    component.onWorkflowUpdated('wf-1');
    expect(navigateSpy).toHaveBeenCalledWith(
      ['/workflows', 'wf-1'],
      { state: { from: 'edit' } },
    );
  });

  it('should navigate to /workflows/:id on cancel', () => {
    const navigateSpy = spyOn(router, 'navigate');
    component.onCancel();
    expect(navigateSpy).toHaveBeenCalledWith(['/workflows', component.workflowId]);
  });
});
