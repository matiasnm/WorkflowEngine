import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AllExecutionsComponent } from './all-executions.component';
import { EXECUTION_API_PORT, ExecutionApiPort } from '../../services/execution-api.port';
import { WORKFLOW_API_PORT, WorkflowApiPort } from '../../services/workflow-api.port';
import { StateColorService } from '../../services/state-color.service';
import { ExecutionResponse, WorkflowSummary } from '../../models';

describe('AllExecutionsComponent', () => {
  let component: AllExecutionsComponent;
  let fixture: ComponentFixture<AllExecutionsComponent>;
  let execApiSpy: jasmine.SpyObj<ExecutionApiPort>;
  let workflowApiSpy: jasmine.SpyObj<WorkflowApiPort>;
  let stateColorSpy: jasmine.SpyObj<StateColorService>;

  const mockWorkflows: WorkflowSummary[] = [
    { id: 'wf-1', name: 'Workflow A' },
    { id: 'wf-2', name: 'Workflow B' },
  ];

  // Use UUID-length IDs so truncation actually fires
  const wf1Executions: ExecutionResponse[] = [
    {
      id: '550e8400-e29b-41d4-a716-446655440000',
      workflowId: 'wf-1',
      currentState: { code: 'in_review', name: 'IN REVIEW', terminal: false },
      currentStateSince: '2026-06-19T10:00:00Z',
    },
  ];

  const wf2Executions: ExecutionResponse[] = [
    {
      id: '660e8400-e29b-41d4-a716-446655440001',
      workflowId: 'wf-2',
      currentState: { code: 'approved', name: 'APPROVED', terminal: true },
      currentStateSince: '2026-06-19T11:00:00Z',
    },
  ];

  function setupApiSpies(): void {
    workflowApiSpy.listWorkflows.and.returnValue(of(mockWorkflows));
    execApiSpy.listExecutions.and.callFake((wfId: string) => {
      if (wfId === 'wf-1') return of(wf1Executions);
      if (wfId === 'wf-2') return of(wf2Executions);
      return of([]);
    });
  }

  beforeEach(async () => {
    localStorage.clear();

    execApiSpy     = jasmine.createSpyObj('ExecutionApiPort', ['listExecutions']);
    workflowApiSpy = jasmine.createSpyObj('WorkflowApiPort',  ['listWorkflows']);
    stateColorSpy  = jasmine.createSpyObj('StateColorService', ['getColor', 'getOrCreateColors']);
    stateColorSpy.getColor.and.returnValue(null);

    await TestBed.configureTestingModule({
      imports: [AllExecutionsComponent],
      providers: [
        { provide: EXECUTION_API_PORT, useValue: execApiSpy },
        { provide: WORKFLOW_API_PORT,  useValue: workflowApiSpy },
        { provide: StateColorService,  useValue: stateColorSpy },
      ],
    }).compileComponents();
  });

  function createComponent(workflows?: WorkflowSummary[]): void {
    fixture   = TestBed.createComponent(AllExecutionsComponent);
    component = fixture.componentInstance;
    if (workflows !== undefined) {
      component.workflows = workflows;
    }
  }

  // ── Success ────────────────────────────────────────────────────────────────

  describe('success state', () => {
    beforeEach(() => {
      setupApiSpies();
      createComponent();
      fixture.detectChanges();
    });

    it('renders a row for each execution', () => {
      const rows = fixture.nativeElement.querySelectorAll('.we-execution-row');
      expect(rows.length).toBe(2);
    });

    it('displays workflow name, truncated id, state name and code', () => {
      const rows = fixture.nativeElement.querySelectorAll('.we-execution-row') as NodeListOf<HTMLElement>;
      expect(rows[0].textContent).toContain('Workflow A');
      expect(rows[0].textContent).toContain('550e…');
      expect(rows[0].textContent).toContain('IN REVIEW');
      expect(rows[0].textContent).toContain('(in_review)');
    });

    it('emits executionSelected when a row is clicked', () => {
      const emitted: string[] = [];
      const sub = component.executionSelected.subscribe(v => emitted.push(v));
      (fixture.nativeElement.querySelectorAll('.we-execution-row')[0] as HTMLElement).click();
      expect(emitted).toEqual(['550e8400-e29b-41d4-a716-446655440000']);
      sub.unsubscribe();
    });
  });

  // ── Workflows input bypasses self-fetch on refresh ────────────────────────

  describe('workflows input', () => {
    it('does not re-fetch the workflow list on refresh when workflows are provided', () => {
      setupApiSpies();
      createComponent(mockWorkflows);
      fixture.detectChanges();

      // Clear the call recorded during initial construction
      workflowApiSpy.listWorkflows.calls.reset();

      // Refreshing should use this._workflows, not re-call listWorkflows
      component.executions.refresh();
      fixture.detectChanges();

      expect(workflowApiSpy.listWorkflows).not.toHaveBeenCalled();
      const rows = fixture.nativeElement.querySelectorAll('.we-execution-row');
      expect(rows.length).toBe(2);
    });
  });

  // ── Empty ──────────────────────────────────────────────────────────────────

  describe('empty state', () => {
    it('shows empty message when no executions exist', () => {
      workflowApiSpy.listWorkflows.and.returnValue(of([]));
      createComponent();
      fixture.detectChanges();
      const emptyEl = fixture.nativeElement.querySelector('.we-all-executions__empty');
      expect(emptyEl).toBeTruthy();
      expect(emptyEl.textContent).toContain('No executions found.');
    });
  });

  // ── Error ──────────────────────────────────────────────────────────────────

  describe('error state', () => {
    it('shows error banner when the API fails', () => {
      workflowApiSpy.listWorkflows.and.returnValue(throwError(() => new Error('fail')));
      createComponent();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('we-error-banner')).toBeTruthy();
    });

    it('emits errorEvent on error after a refresh', () => {
      // Initial load succeeds so we can subscribe before triggering the error
      workflowApiSpy.listWorkflows.and.returnValue(of([]));
      createComponent();
      fixture.detectChanges();

      const emitted: string[] = [];
      const sub = component.errorEvent.subscribe(v => emitted.push(v));

      workflowApiSpy.listWorkflows.and.returnValue(throwError(() => new Error('fail')));
      component.executions.refresh();
      fixture.detectChanges();

      expect(emitted).toEqual(['Failed to load executions.']);
      sub.unsubscribe();
    });
  });

  // ── State colour swatches ─────────────────────────────────────────────────

  describe('state colour swatches', () => {
    const colorMap: Record<string, string> = {
      in_review: 'rgb(92, 107, 192)',
      approved:  'rgb(244, 67, 54)',
    };

    beforeEach(() => {
      stateColorSpy.getColor.and.callFake(
        (_wfId: string, code: string): string | null => colorMap[code] ?? null,
      );
      setupApiSpies();
      createComponent();
      fixture.detectChanges();
    });

    it('renders a swatch for each execution row', () => {
      const swatches = fixture.nativeElement.querySelectorAll('.we-state-swatch');
      expect(swatches.length).toBe(2);
    });

    it('sets background-color from the service using each row\'s own workflowId', () => {
      const swatches = fixture.nativeElement.querySelectorAll(
        '.we-state-swatch',
      ) as NodeListOf<HTMLElement>;
      expect(swatches[0].style.backgroundColor).toBe(colorMap['in_review']);
      expect(swatches[1].style.backgroundColor).toBe(colorMap['approved']);
    });

    it('calls getColor with each execution\'s own workflowId', () => {
      expect(stateColorSpy.getColor).toHaveBeenCalledWith('wf-1', 'in_review');
      expect(stateColorSpy.getColor).toHaveBeenCalledWith('wf-2', 'approved');
    });

    it('swatch has no background when service returns null', () => {
      stateColorSpy.getColor.and.returnValue(null);
      fixture.detectChanges();
      const swatches = fixture.nativeElement.querySelectorAll(
        '.we-state-swatch',
      ) as NodeListOf<HTMLElement>;
      swatches.forEach(s => expect(s.style.backgroundColor).toBe(''));
    });

    it('clicking a row still emits executionSelected (swatch is not interactive)', () => {
      const emitted: string[] = [];
      const sub = component.executionSelected.subscribe(v => emitted.push(v));
      (fixture.nativeElement.querySelector('.we-execution-row') as HTMLElement).click();
      expect(emitted).toEqual(['550e8400-e29b-41d4-a716-446655440000']);
      sub.unsubscribe();
    });

    it('no swatches in error state', () => {
      workflowApiSpy.listWorkflows.and.returnValue(throwError(() => new Error('fail')));
      createComponent();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelectorAll('.we-state-swatch').length).toBe(0);
    });

    it('no swatches for empty execution list', () => {
      workflowApiSpy.listWorkflows.and.returnValue(of([]));
      createComponent();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelectorAll('.we-state-swatch').length).toBe(0);
    });
  });
});
