import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { WorkflowListPageComponent } from './workflow-list-page.component';
import { WorkflowApiService } from 'workflow-engine';
import { of } from 'rxjs';

describe('WorkflowListPageComponent', () => {
  let component: WorkflowListPageComponent;
  let fixture: ComponentFixture<WorkflowListPageComponent>;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkflowListPageComponent],
      providers: [
        provideRouter([]),
        { provide: WorkflowApiService, useValue: { listWorkflows: () => of([]) } },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(WorkflowListPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render we-workflow-list component', () => {
    const el = fixture.nativeElement.querySelector('we-workflow-list');
    expect(el).toBeTruthy();
  });

  it('should navigate to /workflows/:id on workflowSelected', () => {
    const navigateSpy = spyOn(router, 'navigate');
    component.onWorkflowSelected('test-uuid');
    expect(navigateSpy).toHaveBeenCalledWith(['/workflows', 'test-uuid']);
  });
});
