import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { ExecutionListComponent } from './execution-list.component';
import { ExecutionApiService } from '../../services/execution-api.service';
import { ExecutionResponse } from '../../models';

describe('ExecutionListComponent', () => {
  let component: ExecutionListComponent;
  let fixture: ComponentFixture<ExecutionListComponent>;
  let apiServiceSpy: jasmine.SpyObj<ExecutionApiService>;

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
    const spy = jasmine.createSpyObj('ExecutionApiService', ['listExecutions']);

    await TestBed.configureTestingModule({
      imports: [ExecutionListComponent],
      providers: [
        { provide: ExecutionApiService, useValue: spy },
      ],
    }).compileComponents();

    apiServiceSpy = TestBed.inject(ExecutionApiService) as jasmine.SpyObj<ExecutionApiService>;
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
      const errorEl = fixture.nativeElement.querySelector('.we-execution-list__error');
      expect(errorEl).toBeTruthy();
      expect(errorEl.textContent).toContain('Failed to load executions.');

      // No retry button — parent handles retry
      const retryBtn = errorEl.querySelector('.we-btn--retry');
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
      apiServiceSpy.listExecutions.and.returnValue(throwError(() => new Error('API error')));
      createComponent();

      const emitted: string[] = [];
      const sub = component.errorEvent.subscribe((val) => emitted.push(val));

      fixture.detectChanges();

      expect(emitted).toEqual(['Failed to load executions.']);
      sub.unsubscribe();
    });
  });
});
