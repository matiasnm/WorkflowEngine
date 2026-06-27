import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Location } from '@angular/common';
import { WorkflowDetailPageComponent } from './workflow-detail-page.component';
import { WORKFLOW_API_PORT, EXECUTION_API_PORT } from 'workflow-engine';
import { of } from 'rxjs';

describe('WorkflowDetailPageComponent', () => {
  let component: WorkflowDetailPageComponent;
  let fixture: ComponentFixture<WorkflowDetailPageComponent>;
  let router: Router;
  let location: Location;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkflowDetailPageComponent],
      providers: [
        provideRouter([
          { path: 'workflows/:id', component: WorkflowDetailPageComponent },
        ]),
        { provide: WORKFLOW_API_PORT, useValue: { getWorkflow: () => of({ id: 'wf-1', name: 'test', states: [], transitions: [], initialState: '' }) } },
        { provide: EXECUTION_API_PORT, useValue: { startExecution: () => of({}), listExecutions: () => of({ content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 }) } },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    location = TestBed.inject(Location);
    fixture = TestBed.createComponent(WorkflowDetailPageComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render we-workflow-detail component', () => {
    fixture.detectChanges();
    const el = fixture.nativeElement.querySelector('we-workflow-detail');
    expect(el).toBeTruthy();
  });

  it('should navigate to /executions/:id on executionCreated', () => {
    const navigateSpy = spyOn(router, 'navigate');
    component.onExecutionCreated('exec-1');
    expect(navigateSpy).toHaveBeenCalledWith(['/executions', 'exec-1']);
  });

  it('should call location.back() on back', () => {
    const backSpy = spyOn(location, 'back');
    component.onBack();
    expect(backSpy).toHaveBeenCalled();
  });
});
