import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { WorkflowCreatePageComponent } from './workflow-create-page.component';
import { WorkflowApiService } from 'workflow-engine';
import { of } from 'rxjs';

describe('WorkflowCreatePageComponent', () => {
  let component: WorkflowCreatePageComponent;
  let fixture: ComponentFixture<WorkflowCreatePageComponent>;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkflowCreatePageComponent],
      providers: [
        provideRouter([]),
        { provide: WorkflowApiService, useValue: { createWorkflow: () => of({ workflowId: 'new-id' }) } },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(WorkflowCreatePageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render we-workflow-create component', () => {
    const el = fixture.nativeElement.querySelector('we-workflow-create');
    expect(el).toBeTruthy();
  });

  it('should navigate to /workflows/:id on workflowCreated', () => {
    const navigateSpy = spyOn(router, 'navigate');
    component.onWorkflowCreated('new-uuid');
    expect(navigateSpy).toHaveBeenCalledWith(['/workflows', 'new-uuid']);
  });

  it('should navigate to / on cancel', () => {
    const navigateSpy = spyOn(router, 'navigate');
    component.onCancel();
    expect(navigateSpy).toHaveBeenCalledWith(['/']);
  });
});
