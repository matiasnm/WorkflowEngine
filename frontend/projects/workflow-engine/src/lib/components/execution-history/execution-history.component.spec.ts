import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { ExecutionHistoryComponent } from './execution-history.component';
import { ExecutionApiService } from '../../services/execution-api.service';
import { HistoryItem } from '../../models';

describe('ExecutionHistoryComponent', () => {
  let component: ExecutionHistoryComponent;
  let fixture: ComponentFixture<ExecutionHistoryComponent>;
  let apiServiceSpy: jasmine.SpyObj<ExecutionApiService>;

  const mockHistoryItems: HistoryItem[] = [
    {
      fromStateCode: 'created',
      fromStateName: 'CREATED',
      toStateCode: 'in_review',
      toStateName: 'IN_REVIEW',
      timestamp: '2026-06-19T10:00:00Z',
    },
    {
      fromStateCode: 'in_review',
      fromStateName: 'IN_REVIEW',
      toStateCode: 'approved',
      toStateName: 'APPROVED',
      timestamp: '2026-06-19T10:05:00Z',
    },
  ];

  const singleItemHistory: HistoryItem[] = [
    {
      fromStateCode: 'created',
      fromStateName: 'CREATED',
      toStateCode: 'in_review',
      toStateName: 'IN_REVIEW',
      timestamp: '2026-06-19T10:00:00Z',
    },
  ];

  beforeEach(async () => {
    const spy = jasmine.createSpyObj('ExecutionApiService', ['getHistory']);

    await TestBed.configureTestingModule({
      imports: [ExecutionHistoryComponent],
      providers: [
        { provide: ExecutionApiService, useValue: spy },
      ],
    }).compileComponents();

    apiServiceSpy = TestBed.inject(ExecutionApiService) as jasmine.SpyObj<ExecutionApiService>;
  });

  function createComponent(): void {
    fixture = TestBed.createComponent(ExecutionHistoryComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('executionId', 'exec-uuid-1');
  }

  describe('loading state', () => {
    it('should show skeleton on mount while data is loading', () => {
      const subject = new Subject<HistoryItem[]>();
      apiServiceSpy.getHistory.and.returnValue(subject.asObservable());
      createComponent();
      fixture.detectChanges();

      // Should show skeleton while loading
      expect(component.loading()).toBeTrue();
      const skeleton = fixture.nativeElement.querySelector('.we-history-skeleton');
      expect(skeleton).toBeTruthy();
      // Should have 4 skeleton timeline rows
      expect(skeleton.children.length).toBe(4);

      // Data arrives
      subject.next(mockHistoryItems);
      subject.complete();
      fixture.detectChanges();

      // Skeleton should be gone
      expect(component.loading()).toBeFalse();
      const skeletonAfter = fixture.nativeElement.querySelector('.we-history-skeleton');
      expect(skeletonAfter).toBeFalsy();
    });

    it('should set loading to false when API call fails', () => {
      apiServiceSpy.getHistory.and.returnValue(throwError(() => new Error('fail')));
      createComponent();
      fixture.detectChanges();

      expect(component.loading()).toBeFalse();
    });
  });

  describe('error state', () => {
    it('should show inline error message on API failure', () => {
      apiServiceSpy.getHistory.and.returnValue(throwError(() => new Error('API error')));
      createComponent();
      fixture.detectChanges();

      const errorEl = fixture.nativeElement.querySelector('.we-history-error');
      expect(errorEl).toBeTruthy();
      expect(errorEl.textContent).toContain('Failed to load execution history.');
    });

    it('should NOT show a retry button (parent handles retry)', () => {
      apiServiceSpy.getHistory.and.returnValue(throwError(() => new Error('API error')));
      createComponent();
      fixture.detectChanges();

      const errorEl = fixture.nativeElement.querySelector('.we-history-error');
      const retryBtn = errorEl?.querySelector('button');
      expect(retryBtn).toBeFalsy();
    });

    it('should set error signal and emit errorEvent', () => {
      apiServiceSpy.getHistory.and.returnValue(throwError(() => new Error('API error')));
      createComponent();

      const emitted: string[] = [];
      const sub = component.errorEvent.subscribe((val) => emitted.push(val));

      fixture.detectChanges();

      expect(component.error()).toBe('Failed to load execution history.');
      expect(emitted).toEqual(['Failed to load execution history.']);
      sub.unsubscribe();
    });

    it('should hide skeleton and history content when in error state', () => {
      apiServiceSpy.getHistory.and.returnValue(throwError(() => new Error('API error')));
      createComponent();
      fixture.detectChanges();

      const skeleton = fixture.nativeElement.querySelector('.we-history-skeleton');
      const timeline = fixture.nativeElement.querySelector('.we-timeline');
      expect(skeleton).toBeFalsy();
      expect(timeline).toBeFalsy();
    });
  });

  describe('empty state', () => {
    beforeEach(() => {
      apiServiceSpy.getHistory.and.returnValue(of([]));
      createComponent();
      fixture.detectChanges();
    });

    it('should show "No history available" message when history is empty', () => {
      const emptyEl = fixture.nativeElement.querySelector('.we-history-empty');
      expect(emptyEl).toBeTruthy();
      expect(emptyEl.textContent).toContain('No history available');
    });

    it('should not show skeleton or timeline when empty', () => {
      const skeleton = fixture.nativeElement.querySelector('.we-history-skeleton');
      const timeline = fixture.nativeElement.querySelector('.we-timeline');
      expect(skeleton).toBeFalsy();
      expect(timeline).toBeFalsy();
    });
  });

  describe('vertical mode (default)', () => {
    beforeEach(() => {
      apiServiceSpy.getHistory.and.returnValue(of(mockHistoryItems));
      createComponent();
      // Default displayMode is 'vertical'
      fixture.detectChanges();
    });

    it('should render the vertical timeline', () => {
      const timeline = fixture.nativeElement.querySelector('.we-timeline--vertical');
      expect(timeline).toBeTruthy();
    });

    it('should show the current state at the top with ▲ indicator', () => {
      const currentEl = fixture.nativeElement.querySelector('.we-timeline__current');
      expect(currentEl).toBeTruthy();
      expect(currentEl.textContent).toContain('▲');
      expect(currentEl.textContent).toContain('APPROVED');

      const currentIndicator = currentEl.querySelector('.we-timeline__indicator--current');
      expect(currentIndicator).toBeTruthy();
    });

    it('should render each history transition item', () => {
      const transitionItems = fixture.nativeElement.querySelectorAll('.we-timeline__transition');
      // 2 history items → 2 transition rows
      expect(transitionItems.length).toBe(2);
    });

    it('should display fromState → toState in each transition row', () => {
      const items = fixture.nativeElement.querySelectorAll('.we-timeline__transition');

      // First item: CREATED → IN_REVIEW
      const firstFrom = items[0].querySelector('.we-timeline__from');
      const firstArrow = items[0].querySelector('.we-timeline__arrow--transition');
      const firstTo = items[0].querySelector('.we-timeline__to');
      expect(firstFrom.textContent).toContain('CREATED');
      expect(firstArrow.textContent).toContain('→');
      expect(firstTo.textContent).toContain('IN_REVIEW');

      // Second item: IN_REVIEW → APPROVED
      const secondFrom = items[1].querySelector('.we-timeline__from');
      const secondTo = items[1].querySelector('.we-timeline__to');
      expect(secondFrom.textContent).toContain('IN_REVIEW');
      expect(secondTo.textContent).toContain('APPROVED');
    });

    it('should show timestamps below each transition', () => {
      const timestamps = fixture.nativeElement.querySelectorAll('.we-timeline__timestamp');
      // At least 2 timestamps (one per transition row)
      expect(timestamps.length).toBeGreaterThanOrEqual(2);
    });

    it('should show the initial state at the bottom', () => {
      const initialEl = fixture.nativeElement.querySelector('.we-timeline__initial');
      expect(initialEl).toBeTruthy();
      expect(initialEl.textContent).toContain('CREATED');
    });

    it('should render connector lines between timeline nodes', () => {
      const connectors = fixture.nativeElement.querySelectorAll('.we-timeline__connector');
      // Should have connectors between sections
      expect(connectors.length).toBeGreaterThan(0);
    });

    it('should not render horizontal timeline elements', () => {
      const horizontalTimeline = fixture.nativeElement.querySelector('.we-timeline--horizontal');
      expect(horizontalTimeline).toBeFalsy();
    });
  });

  describe('vertical mode with single history item', () => {
    beforeEach(() => {
      apiServiceSpy.getHistory.and.returnValue(of(singleItemHistory));
      createComponent();
      fixture.detectChanges();
    });

    it('should render current state at the top', () => {
      const currentEl = fixture.nativeElement.querySelector('.we-timeline__current');
      expect(currentEl.textContent).toContain('IN_REVIEW');
    });

    it('should render one transition item', () => {
      const transitionItems = fixture.nativeElement.querySelectorAll('.we-timeline__transition');
      expect(transitionItems.length).toBe(1);
    });

    it('should render initial state at the bottom', () => {
      const initialEl = fixture.nativeElement.querySelector('.we-timeline__initial');
      expect(initialEl.textContent).toContain('CREATED');
    });
  });

  describe('horizontal mode', () => {
    beforeEach(() => {
      apiServiceSpy.getHistory.and.returnValue(of(mockHistoryItems));
      createComponent();
      fixture.componentRef.setInput('displayMode', 'horizontal');
      fixture.detectChanges();
    });

    it('should render the horizontal timeline', () => {
      const timeline = fixture.nativeElement.querySelector('.we-timeline--horizontal');
      expect(timeline).toBeTruthy();
    });

    it('should render steps for each state in the flow', () => {
      const steps = fixture.nativeElement.querySelectorAll('.we-timeline__step');
      // 1 initial + 2 toStates = 3 steps
      expect(steps.length).toBe(3);
    });

    it('should display state names in order: CREATED → IN_REVIEW → APPROVED', () => {
      const stepNames = fixture.nativeElement.querySelectorAll('.we-timeline__step-name');
      expect(stepNames.length).toBe(3);
      expect(stepNames[0].textContent).toContain('CREATED');
      expect(stepNames[1].textContent).toContain('IN_REVIEW');
      expect(stepNames[2].textContent).toContain('APPROVED');
    });

    it('should mark the last step as current', () => {
      const steps = fixture.nativeElement.querySelectorAll('.we-timeline__step');
      // Last step should have current class
      expect(steps[2].classList).toContain('we-timeline__step--current');
      // First steps should not have current class
      expect(steps[0].classList).not.toContain('we-timeline__step--current');
      expect(steps[1].classList).not.toContain('we-timeline__step--current');
    });

    it('should show (current) label on the last step', () => {
      const labels = fixture.nativeElement.querySelectorAll('.we-timeline__current-label');
      expect(labels.length).toBe(1);
      expect(labels[0].textContent).toContain('current');
    });

    it('should show timestamps on non-current steps', () => {
      const stepTimes = fixture.nativeElement.querySelectorAll('.we-timeline__step-time');
      // 2 non-current steps should have timestamps
      expect(stepTimes.length).toBe(2);
    });

    it('should render arrows between steps', () => {
      const arrows = fixture.nativeElement.querySelectorAll('.we-timeline__arrow--horizontal');
      // 3 steps → 2 arrows between them
      expect(arrows.length).toBe(2);
    });

    it('should show dot indicator on the current step', () => {
      const dotIndicators = fixture.nativeElement.querySelectorAll('.we-timeline__dot-indicator');
      expect(dotIndicators.length).toBe(1);
    });

    it('should not render vertical timeline elements', () => {
      const verticalTimeline = fixture.nativeElement.querySelector('.we-timeline--vertical');
      expect(verticalTimeline).toBeFalsy();
    });
  });

  describe('horizontal mode with single history item', () => {
    beforeEach(() => {
      apiServiceSpy.getHistory.and.returnValue(of(singleItemHistory));
      createComponent();
      fixture.componentRef.setInput('displayMode', 'horizontal');
      fixture.detectChanges();
    });

    it('should render 2 steps (initial + current)', () => {
      const steps = fixture.nativeElement.querySelectorAll('.we-timeline__step');
      expect(steps.length).toBe(2);
    });

    it('should show CREATED as initial and IN_REVIEW as current', () => {
      const stepNames = fixture.nativeElement.querySelectorAll('.we-timeline__step-name');
      expect(stepNames[0].textContent).toContain('CREATED');
      expect(stepNames[1].textContent).toContain('IN_REVIEW');
    });

    it('should mark last step as current', () => {
      const steps = fixture.nativeElement.querySelectorAll('.we-timeline__step');
      expect(steps[1].classList).toContain('we-timeline__step--current');
    });
  });

  describe('displayMode input', () => {
    it('should default to vertical mode', () => {
      apiServiceSpy.getHistory.and.returnValue(of(mockHistoryItems));
      createComponent();
      fixture.detectChanges();

      expect(component.displayMode()).toBe('vertical');
    });

    it('should accept "horizontal" as displayMode', () => {
      apiServiceSpy.getHistory.and.returnValue(of(mockHistoryItems));
      createComponent();
      fixture.componentRef.setInput('displayMode', 'horizontal');
      fixture.detectChanges();

      expect(component.displayMode()).toBe('horizontal');
    });

    it('should switch rendering when displayMode changes', () => {
      apiServiceSpy.getHistory.and.returnValue(of(mockHistoryItems));
      createComponent();
      fixture.detectChanges();

      // Default: vertical
      expect(fixture.nativeElement.querySelector('.we-timeline--vertical')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('.we-timeline--horizontal')).toBeFalsy();

      // Switch to horizontal
      fixture.componentRef.setInput('displayMode', 'horizontal');
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.we-timeline--vertical')).toBeFalsy();
      expect(fixture.nativeElement.querySelector('.we-timeline--horizontal')).toBeTruthy();
    });
  });

  describe('errorEvent output', () => {
    it('should emit errorEvent on API error', () => {
      apiServiceSpy.getHistory.and.returnValue(throwError(() => new Error('API error')));
      createComponent();

      const emitted: string[] = [];
      const sub = component.errorEvent.subscribe((val) => emitted.push(val));

      fixture.detectChanges();

      expect(emitted).toEqual(['Failed to load execution history.']);
      sub.unsubscribe();
    });
  });
});
