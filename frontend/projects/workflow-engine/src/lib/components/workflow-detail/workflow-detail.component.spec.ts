import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Subject, of, throwError } from 'rxjs';
import { WorkflowDetailComponent } from './workflow-detail.component';
import { WorkflowApiService } from '../../services/workflow-api.service';
import { ExecutionApiService } from '../../services/execution-api.service';
import { WorkflowDetail } from '../../models';

describe('WorkflowDetailComponent', () => {
  let component: WorkflowDetailComponent;
  let fixture: ComponentFixture<WorkflowDetailComponent>;
  let workflowApiSpy: jasmine.SpyObj<WorkflowApiService>;
  let executionApiSpy: jasmine.SpyObj<ExecutionApiService>;

  const mockWorkflowDetail: WorkflowDetail = {
    id: 'uuid-1',
    name: 'simple-approval',
    states: [
      { code: 'created', name: 'CREATED', terminal: false },
      { code: 'in_review', name: 'IN_REVIEW', terminal: false },
      { code: 'approved', name: 'APPROVED', terminal: true },
      { code: 'rejected', name: 'REJECTED', terminal: true },
    ],
    transitions: [
      { from: 'created', to: 'in_review' },
      { from: 'in_review', to: 'approved' },
      { from: 'in_review', to: 'rejected' },
    ],
    initialState: 'created',
  };

  beforeEach(async () => {
    const wfSpy = jasmine.createSpyObj('WorkflowApiService', ['getWorkflow']);
    const execSpy = jasmine.createSpyObj('ExecutionApiService', ['startExecution']);

    await TestBed.configureTestingModule({
      imports: [WorkflowDetailComponent],
      providers: [
        { provide: WorkflowApiService, useValue: wfSpy },
        { provide: ExecutionApiService, useValue: execSpy },
      ],
    }).compileComponents();

    workflowApiSpy = TestBed.inject(WorkflowApiService) as jasmine.SpyObj<WorkflowApiService>;
    executionApiSpy = TestBed.inject(ExecutionApiService) as jasmine.SpyObj<ExecutionApiService>;
  });

  function createComponent(): void {
    fixture = TestBed.createComponent(WorkflowDetailComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('workflowId', 'uuid-1');
  }

  describe('loading state', () => {
    it('should show skeleton shimmer on mount while data is loading', () => {
      const subject = new Subject<WorkflowDetail>();
      workflowApiSpy.getWorkflow.and.returnValue(subject.asObservable());
      createComponent();
      fixture.detectChanges();

      // Should show skeleton while loading
      expect(component.loading()).toBeTrue();
      const skeleton = fixture.nativeElement.querySelector('.we-workflow-detail__skeleton');
      expect(skeleton).toBeTruthy();
      // Should have 4 skeleton blocks
      expect(skeleton.children.length).toBe(4);

      // Data arrives
      subject.next(mockWorkflowDetail);
      subject.complete();
      fixture.detectChanges();

      // Skeleton should be gone
      expect(component.loading()).toBeFalse();
      const skeletonAfter = fixture.nativeElement.querySelector('.we-workflow-detail__skeleton');
      expect(skeletonAfter).toBeFalsy();
      // Workflow name should be visible
      const nameEl = fixture.nativeElement.querySelector('.we-workflow-detail__name');
      expect(nameEl).toBeTruthy();
      expect(nameEl.textContent).toContain('simple-approval');
    });

    it('should set loading to false when API call fails', () => {
      workflowApiSpy.getWorkflow.and.returnValue(throwError(() => new Error('fail')));
      createComponent();
      fixture.detectChanges();

      expect(component.loading()).toBeFalse();
    });
  });

  describe('success state', () => {
    beforeEach(() => {
      workflowApiSpy.getWorkflow.and.returnValue(of(mockWorkflowDetail));
      createComponent();
      fixture.detectChanges();
    });

    it('should render the workflow name as heading', () => {
      const nameEl = fixture.nativeElement.querySelector('.we-workflow-detail__name');
      expect(nameEl).toBeTruthy();
      expect(nameEl.textContent).toContain('simple-approval');
    });

    it('should render states table with Code, Name, Terminal columns', () => {
      const table = fixture.nativeElement.querySelector('.we-table');
      expect(table).toBeTruthy();

      // Check headers
      const headers = table.querySelectorAll('thead th');
      expect(headers.length).toBe(3);
      expect(headers[0].textContent).toContain('Code');
      expect(headers[1].textContent).toContain('Name');
      expect(headers[2].textContent).toContain('Terminal');

      // Check rows (4 states)
      const rows = table.querySelectorAll('tbody tr');
      expect(rows.length).toBe(4);
    });

    it('should render state rows with correct data', () => {
      const rows = fixture.nativeElement.querySelectorAll('.we-table tbody tr');

      // First row: created
      const cells0 = rows[0].querySelectorAll('td');
      expect(cells0[0].textContent).toContain('created');
      expect(cells0[1].textContent).toContain('CREATED');
      expect(cells0[2].textContent).toContain('No');

      // Last row: rejected (terminal)
      const cells3 = rows[3].querySelectorAll('td');
      expect(cells3[2].textContent).toContain('Yes');
    });

    it('should render transitions list', () => {
      const transitionItems = fixture.nativeElement.querySelectorAll('.we-transition-item');
      expect(transitionItems.length).toBe(3);
    });

    it('should render each transition with from → to format', () => {
      const transitionItems = fixture.nativeElement.querySelectorAll('.we-transition-item');

      const firstFrom = transitionItems[0].querySelector('.we-transition-from');
      const firstArrow = transitionItems[0].querySelector('.we-transition-arrow');
      const firstTo = transitionItems[0].querySelector('.we-transition-to');
      expect(firstFrom.textContent).toContain('created');
      expect(firstArrow.textContent).toContain('→');
      expect(firstTo.textContent).toContain('in_review');
    });

    it('should show Start Execution button', () => {
      const startBtn = fixture.nativeElement.querySelector('.we-btn--start');
      expect(startBtn).toBeTruthy();
      expect(startBtn.textContent).toContain('▶ Start Execution');
    });

    it('should not show skeleton or error when data is loaded', () => {
      const skeleton = fixture.nativeElement.querySelector('.we-workflow-detail__skeleton');
      const error = fixture.nativeElement.querySelector('.we-workflow-detail__error');
      expect(skeleton).toBeFalsy();
      expect(error).toBeFalsy();
    });
  });

  describe('error state', () => {
    it('should show error message and retry button on API failure', () => {
      workflowApiSpy.getWorkflow.and.returnValue(throwError(() => new Error('API error')));
      createComponent();
      fixture.detectChanges();

      const errorEl = fixture.nativeElement.querySelector('.we-workflow-detail__error');
      expect(errorEl).toBeTruthy();
      expect(errorEl.textContent).toContain('Failed to load workflow.');

      const retryBtn = errorEl.querySelector('.we-btn--retry');
      expect(retryBtn).toBeTruthy();
    });

    it('should show "Workflow not found." for 404 errors', () => {
      workflowApiSpy.getWorkflow.and.returnValue(throwError(() => ({ status: 404 })));
      createComponent();
      fixture.detectChanges();

      const errorEl = fixture.nativeElement.querySelector('.we-workflow-detail__error');
      expect(errorEl.textContent).toContain('Workflow not found.');
    });

    it('should set error signal and emit errorEvent', () => {
      workflowApiSpy.getWorkflow.and.returnValue(throwError(() => new Error('API error')));
      createComponent();

      const emitted: string[] = [];
      const sub = component.errorEvent.subscribe((val) => emitted.push(val));

      fixture.detectChanges();

      expect(component.error()).toBe('Failed to load workflow.');
      expect(emitted).toEqual(['Failed to load workflow.']);
      sub.unsubscribe();
    });

    it('should hide skeleton and content when in error state', () => {
      workflowApiSpy.getWorkflow.and.returnValue(throwError(() => new Error('API error')));
      createComponent();
      fixture.detectChanges();

      const skeleton = fixture.nativeElement.querySelector('.we-workflow-detail__skeleton');
      const nameEl = fixture.nativeElement.querySelector('.we-workflow-detail__name');
      expect(skeleton).toBeFalsy();
      expect(nameEl).toBeFalsy();
    });

    it('should retry loading when retry button is clicked', () => {
      workflowApiSpy.getWorkflow.and.returnValue(throwError(() => new Error('fail')));
      createComponent();
      fixture.detectChanges();

      // Reset spy to return data on second call
      workflowApiSpy.getWorkflow.and.returnValue(of(mockWorkflowDetail));

      const retryBtn = fixture.nativeElement.querySelector('.we-btn--retry');
      retryBtn.click();
      fixture.detectChanges();

      // After retry, should show detail instead of error
      expect(component.error()).toBeNull();
      expect(component.loading()).toBeFalse();
      const nameEl = fixture.nativeElement.querySelector('.we-workflow-detail__name');
      expect(nameEl).toBeTruthy();
      expect(nameEl.textContent).toContain('simple-approval');
    });
  });

  describe('start execution flow', () => {
    beforeEach(() => {
      workflowApiSpy.getWorkflow.and.returnValue(of(mockWorkflowDetail));
      createComponent();
      fixture.detectChanges();
    });

    it('should show spinner and disable button while starting execution', () => {
      const subject = new Subject<{ executionId: string }>();
      executionApiSpy.startExecution.and.returnValue(subject.asObservable());

      const startBtn = fixture.nativeElement.querySelector('.we-btn--start');
      startBtn.click();
      fixture.detectChanges();

      // Button should be disabled and show spinner
      expect(startBtn.disabled).toBeTrue();
      expect(component.startingExecution()).toBeTrue();
      const spinner = startBtn.querySelector('.we-spinner');
      expect(spinner).toBeTruthy();
      // Text should change to "Starting…"
      expect(startBtn.textContent).toContain('Starting…');
    });

    it('should emit executionCreated with execution UUID on success', () => {
      executionApiSpy.startExecution.and.returnValue(of({ executionId: 'exec-uuid-123' }));

      const emitted: string[] = [];
      const sub = component.executionCreated.subscribe((val) => emitted.push(val));

      const startBtn = fixture.nativeElement.querySelector('.we-btn--start');
      startBtn.click();
      fixture.detectChanges();

      expect(emitted).toEqual(['exec-uuid-123']);
      expect(component.startingExecution()).toBeFalse();
      sub.unsubscribe();
    });

    it('should show inline error and re-enable button on start execution failure', () => {
      executionApiSpy.startExecution.and.returnValue(throwError(() => new Error('API error')));

      const emitted: string[] = [];
      const sub = component.errorEvent.subscribe((val) => emitted.push(val));

      const startBtn = fixture.nativeElement.querySelector('.we-btn--start');
      startBtn.click();
      fixture.detectChanges();

      // Button should be re-enabled
      expect(startBtn.disabled).toBeFalse();
      expect(component.startingExecution()).toBeFalse();

      // Error message should be shown
      const execErrorEl = fixture.nativeElement.querySelector('.we-workflow-detail__exec-error');
      expect(execErrorEl).toBeTruthy();
      expect(execErrorEl.textContent).toContain('Failed to start execution.');

      // errorEvent should be emitted
      expect(emitted).toEqual(['Failed to start execution.']);
      sub.unsubscribe();
    });
  });

  describe('back button', () => {
    beforeEach(() => {
      workflowApiSpy.getWorkflow.and.returnValue(of(mockWorkflowDetail));
      createComponent();
      fixture.detectChanges();
    });

    it('should emit back event when back button is clicked', () => {
      const emitted: void[] = [];
      const sub = component.back.subscribe(() => emitted.push(undefined));

      const backBtn = fixture.nativeElement.querySelector('.we-btn--back');
      backBtn.click();

      expect(emitted.length).toBe(1);
      sub.unsubscribe();
    });
  });
});
