import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { ExecutionListComponent } from './execution-list.component';
import { EXECUTION_API_PORT, ExecutionApiPort } from '../../services/execution-api.port';
import { StateColorService } from '../../services/state-color.service';
import { ExecutionResponse } from '../../models';

describe('ExecutionListComponent', () => {
  let component: ExecutionListComponent;
  let fixture: ComponentFixture<ExecutionListComponent>;
  let apiServiceSpy: jasmine.SpyObj<ExecutionApiPort>;
  let stateColorSpy: jasmine.SpyObj<StateColorService>;

  const mockExecutions: ExecutionResponse[] = [
    {
      id: '550e8400-e29b-41d4-a716-446655440000',
      workflowId: 'wf-uuid-1',
      currentState: { code: 'in_review', name: 'IN REVIEW', terminal: false },
      currentStateSince: '2026-06-19T10:05:00Z',
    },
    {
      id: '660e8400-e29b-41d4-a716-446655440001',
      workflowId: 'wf-uuid-1',
      currentState: { code: 'created', name: 'CREATED', terminal: false },
      currentStateSince: '2026-06-19T10:00:00Z',
    },
  ];

  beforeEach(async () => {
    localStorage.clear();
    const spy = jasmine.createSpyObj('ExecutionApiPort', ['listExecutions']);

    stateColorSpy = jasmine.createSpyObj('StateColorService', ['getColor', 'getOrCreateColors']);
    stateColorSpy.getColor.and.returnValue(null);

    await TestBed.configureTestingModule({
      imports: [ExecutionListComponent],
      providers: [
        { provide: EXECUTION_API_PORT, useValue: spy },
        { provide: StateColorService, useValue: stateColorSpy },
      ],
    }).compileComponents();

    apiServiceSpy = TestBed.inject(EXECUTION_API_PORT) as jasmine.SpyObj<ExecutionApiPort>;
  });

  function createComponent(): void {
    fixture = TestBed.createComponent(ExecutionListComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('workflowId', 'wf-uuid-1');
  }

  describe('loading state', () => {
    it('should show skeleton shimmer on mount while data is loading', () => {
      const subject = new Subject<ExecutionResponse[]>();
      apiServiceSpy.listExecutions.and.returnValue(subject.asObservable());
      createComponent();
      fixture.detectChanges();

      // Should show skeleton while loading
      expect(component.loading()).toBeTrue();
      const skeleton = fixture.nativeElement.querySelector('.we-execution-list__skeleton');
      expect(skeleton).toBeTruthy();
      // Should have 3 skeleton placeholder rows
      expect(skeleton.children.length).toBe(3);
      expect(skeleton.children[0].classList).toContain('we-skeleton-row');

      // Data arrives
      subject.next(mockExecutions);
      subject.complete();
      fixture.detectChanges();

      // Skeleton should be gone, table should be visible
      expect(component.loading()).toBeFalse();
      const skeletonAfter = fixture.nativeElement.querySelector('.we-execution-list__skeleton');
      expect(skeletonAfter).toBeFalsy();
      const rows = fixture.nativeElement.querySelectorAll('.we-execution-row');
      expect(rows.length).toBe(2);
    });

    it('should set loading to false when API call fails', () => {
      apiServiceSpy.listExecutions.and.returnValue(throwError(() => new Error('fail')));
      createComponent();
      fixture.detectChanges();

      // After error, loading should be false
      expect(component.loading()).toBeFalse();
    });
  });

  describe('success state', () => {
    beforeEach(() => {
      apiServiceSpy.listExecutions.and.returnValue(of(mockExecutions));
      createComponent();
      fixture.detectChanges();
    });

    it('should render execution rows for each execution', () => {
      const rows = fixture.nativeElement.querySelectorAll('.we-execution-row');
      expect(rows.length).toBe(2);
    });

    it('should display truncated execution ID', () => {
      const codeElements = fixture.nativeElement.querySelectorAll('.we-execution-row code');
      expect(codeElements[0].textContent).toContain('550e…');
      expect(codeElements[1].textContent).toContain('660e…');
    });

    it('should display state name and code', () => {
      const stateElements = fixture.nativeElement.querySelectorAll('.we-execution-state');
      expect(stateElements[0].textContent).toContain('IN REVIEW');
      const codeElements = fixture.nativeElement.querySelectorAll('.we-execution-state-code');
      expect(codeElements[0].textContent).toContain('(in_review)');
    });

    it('should emit executionSelected when clicking a row', () => {
      const emitted: string[] = [];
      const sub = component.executionSelected.subscribe((val) => emitted.push(val));
      const rows = fixture.nativeElement.querySelectorAll('.we-execution-row');

      rows[0].click();
      expect(emitted).toEqual(['550e8400-e29b-41d4-a716-446655440000']);

      rows[1].click();
      expect(emitted).toEqual([
        '550e8400-e29b-41d4-a716-446655440000',
        '660e8400-e29b-41d4-a716-446655440001',
      ]);
      sub.unsubscribe();
    });
  });

  describe('empty state', () => {
    beforeEach(() => {
      apiServiceSpy.listExecutions.and.returnValue(of([]));
      createComponent();
      fixture.detectChanges();
    });

    it('should show empty state message when no executions', () => {
      const emptyEl = fixture.nativeElement.querySelector('.we-execution-list__empty');
      expect(emptyEl).toBeTruthy();
      expect(emptyEl.textContent).toContain('No executions yet. Start one above.');
    });

    it('should not show skeleton or table when empty', () => {
      const skeleton = fixture.nativeElement.querySelector('.we-execution-list__skeleton');
      const table = fixture.nativeElement.querySelector('.we-execution-list__table');
      expect(skeleton).toBeFalsy();
      expect(table).toBeFalsy();
    });
  });

  describe('error state', () => {
    beforeEach(() => {
      apiServiceSpy.listExecutions.and.returnValue(throwError(() => new Error('API error')));
      createComponent();
      fixture.detectChanges();
    });

    it('should show error message without retry button', () => {
      const errorEl = fixture.nativeElement.querySelector('we-error-banner');
      expect(errorEl).toBeTruthy();
      expect(errorEl.textContent).toContain('Failed to load executions.');

      // No retry button — parent handles retry (showRetry is false by default)
      const retryBtn = fixture.nativeElement.querySelector('.we-btn--retry');
      expect(retryBtn).toBeFalsy();
    });

    it('should set error signal and emit errorEvent', () => {
      expect(component.error()).toBe('Failed to load executions.');
    });

    it('should hide skeleton and table when in error state', () => {
      const skeleton = fixture.nativeElement.querySelector('.we-execution-list__skeleton');
      const table = fixture.nativeElement.querySelector('.we-execution-list__table');
      expect(skeleton).toBeFalsy();
      expect(table).toBeFalsy();
    });
  });

  describe('errorEvent output', () => {
    it('should emit errorEvent on API error', () => {
      // First load succeeds
      apiServiceSpy.listExecutions.and.returnValue(of([]));
      createComponent();
      fixture.detectChanges();

      const emitted: string[] = [];
      const sub = component.errorEvent.subscribe((val) => emitted.push(val));

      // Make the next call fail and trigger a refresh
      apiServiceSpy.listExecutions.and.returnValue(throwError(() => new Error('API error')));
      component['execsAsync']()?.refresh();
      fixture.detectChanges();

      expect(emitted).toEqual(['Failed to load executions.']);
      sub.unsubscribe();
    });
  });

  describe('state colour swatches', () => {
    const colorMap: Record<string, string> = {
      in_review: 'rgb(92, 107, 192)',
      created:   'rgb(76, 175, 80)',
    };

    beforeEach(() => {
      stateColorSpy.getColor.and.callFake(
        (_wfId: string, code: string): string | null => colorMap[code] ?? null,
      );
      apiServiceSpy.listExecutions.and.returnValue(of(mockExecutions));
      createComponent();
      fixture.detectChanges();
    });

    it('renders a swatch span in each state cell', () => {
      const swatches = fixture.nativeElement.querySelectorAll('.we-state-swatch');
      expect(swatches.length).toBe(2);
    });

    it('sets background-color on each swatch from the service', () => {
      const swatches = fixture.nativeElement.querySelectorAll(
        '.we-state-swatch',
      ) as NodeListOf<HTMLElement>;
      expect(swatches[0].style.backgroundColor).toBe(colorMap['in_review']);
      expect(swatches[1].style.backgroundColor).toBe(colorMap['created']);
    });

    it('passes the component workflowId to the service', () => {
      expect(stateColorSpy.getColor).toHaveBeenCalledWith('wf-uuid-1', 'in_review');
      expect(stateColorSpy.getColor).toHaveBeenCalledWith('wf-uuid-1', 'created');
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

    it('no swatches rendered during loading', () => {
      const subject = new Subject<ExecutionResponse[]>();
      apiServiceSpy.listExecutions.and.returnValue(subject.asObservable());
      createComponent();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelectorAll('.we-state-swatch').length).toBe(0);
    });

    it('no swatches rendered in error state', () => {
      apiServiceSpy.listExecutions.and.returnValue(throwError(() => new Error('fail')));
      createComponent();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelectorAll('.we-state-swatch').length).toBe(0);
    });

    it('no swatches rendered for empty list', () => {
      apiServiceSpy.listExecutions.and.returnValue(of([]));
      createComponent();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelectorAll('.we-state-swatch').length).toBe(0);
    });
  });
});
