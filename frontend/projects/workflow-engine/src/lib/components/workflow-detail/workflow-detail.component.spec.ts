import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Subject, of, throwError } from 'rxjs';
import { WorkflowDetailComponent } from './workflow-detail.component';
import { WORKFLOW_API_PORT, WorkflowApiPort } from '../../services/workflow-api.port';
import { EXECUTION_API_PORT, ExecutionApiPort } from '../../services/execution-api.port';
import { WorkflowDetail } from '../../models';

describe('WorkflowDetailComponent', () => {
  let component: WorkflowDetailComponent;
  let fixture: ComponentFixture<WorkflowDetailComponent>;
  let workflowApiSpy: jasmine.SpyObj<WorkflowApiPort>;
  let executionApiSpy: jasmine.SpyObj<ExecutionApiPort>;

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
    localStorage.clear();

    const wfSpy = jasmine.createSpyObj('WorkflowApiPort', ['getWorkflow']);
    const execSpy = jasmine.createSpyObj('ExecutionApiPort', ['startExecution', 'listExecutions']);

    await TestBed.configureTestingModule({
      imports: [WorkflowDetailComponent],
      providers: [
        { provide: WORKFLOW_API_PORT, useValue: wfSpy },
        { provide: EXECUTION_API_PORT, useValue: execSpy },
      ],
    }).compileComponents();

    workflowApiSpy = TestBed.inject(WORKFLOW_API_PORT) as jasmine.SpyObj<WorkflowApiPort>;
    executionApiSpy = TestBed.inject(EXECUTION_API_PORT) as jasmine.SpyObj<ExecutionApiPort>;
  });

  function createComponent(): void {
    // Ensure child ExecutionListComponent has a valid observable return
    executionApiSpy.listExecutions.and.returnValue(of([]));
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

    it('should not render swatches while loading', () => {
      const subject = new Subject<WorkflowDetail>();
      workflowApiSpy.getWorkflow.and.returnValue(subject.asObservable());
      createComponent();
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelectorAll('.we-state-swatch').length).toBe(0);
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

    it('should render states table with swatch, Code, Name, Terminal columns', () => {
      const table = fixture.nativeElement.querySelector('.we-table');
      expect(table).toBeTruthy();

      // 4 columns: swatch | Code | Name | Terminal
      const headers = table.querySelectorAll('thead th');
      expect(headers.length).toBe(4);
      expect(headers[1].textContent).toContain('Code');
      expect(headers[2].textContent).toContain('Name');
      expect(headers[3].textContent).toContain('Terminal');

      // Check rows (4 states)
      const rows = table.querySelectorAll('tbody tr');
      expect(rows.length).toBe(4);
    });

    it('should render state rows with correct data', () => {
      const rows = fixture.nativeElement.querySelectorAll('.we-table tbody tr');

      // First row: created — swatch is cells[0], data starts at cells[1]
      const cells0 = rows[0].querySelectorAll('td');
      expect(cells0[1].textContent).toContain('created');
      expect(cells0[2].textContent).toContain('CREATED');
      expect(cells0[3].textContent).toContain('No');

      // Last row: rejected (terminal)
      const cells3 = rows[3].querySelectorAll('td');
      expect(cells3[3].textContent).toContain('Yes');
    });

    it('should render one swatch per state row', () => {
      const swatches = fixture.nativeElement.querySelectorAll('.we-state-swatch');
      expect(swatches.length).toBe(mockWorkflowDetail.states.length);
    });

    it('first state swatch has green background (#4CAF50)', () => {
      const swatches = fixture.nativeElement.querySelectorAll('.we-state-swatch');
      const firstSwatch = swatches[0] as HTMLElement;
      // Angular sets inline style; normalise to lowercase for comparison
      expect(firstSwatch.style.backgroundColor.toLowerCase()).toContain('');
      // The computed color for N=4 index=0 from the curated palette is #4CAF50
      // Browsers convert hex to rgb(), so compare via computed style
      const computed = window.getComputedStyle(firstSwatch).backgroundColor;
      // rgb(76, 175, 80) is #4CAF50
      expect(computed).toBe('rgb(76, 175, 80)');
    });

    it('last state swatch has red background (#F44336)', () => {
      const swatches = fixture.nativeElement.querySelectorAll('.we-state-swatch');
      const lastSwatch = swatches[swatches.length - 1] as HTMLElement;
      const computed = window.getComputedStyle(lastSwatch).backgroundColor;
      // rgb(244, 67, 54) is #F44336
      expect(computed).toBe('rgb(244, 67, 54)');
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

      const errorEl = fixture.nativeElement.querySelector('we-error-banner');
      expect(errorEl).toBeTruthy();
      expect(errorEl.textContent).toContain('Failed to load workflow.');

      const retryBtn = fixture.nativeElement.querySelector('.we-btn--retry');
      expect(retryBtn).toBeTruthy();
    });

    it('should show error message for 404 errors', () => {
      workflowApiSpy.getWorkflow.and.returnValue(throwError(() => ({ status: 404 })));
      createComponent();
      fixture.detectChanges();

      const errorEl = fixture.nativeElement.querySelector('we-error-banner');
      expect(errorEl).toBeTruthy();
      expect(errorEl.textContent).toContain('Failed to load workflow.');
    });

    it('should set error signal and emit errorEvent on API failure', () => {
      // First load succeeds
      workflowApiSpy.getWorkflow.and.returnValue(of(mockWorkflowDetail));
      createComponent();
      fixture.detectChanges();

      const emitted: string[] = [];
      const sub = component.errorEvent.subscribe((val) => emitted.push(val));

      // Make the next call fail and trigger a refresh
      workflowApiSpy.getWorkflow.and.returnValue(throwError(() => new Error('API error')));
      component['refresh']();
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

    it('should not render swatches in error state', () => {
      workflowApiSpy.getWorkflow.and.returnValue(throwError(() => new Error('API error')));
      createComponent();
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelectorAll('.we-state-swatch').length).toBe(0);
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
