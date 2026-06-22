import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { ExecutionHistoryComponent } from './execution-history.component';
import { EXECUTION_API_PORT, ExecutionApiPort } from '../../services/execution-api.port';
import { StateColorService } from '../../services/state-color.service';
import { HistoryItem } from '../../models';

describe('ExecutionHistoryComponent', () => {
  let component: ExecutionHistoryComponent;
  let fixture: ComponentFixture<ExecutionHistoryComponent>;
  let apiServiceSpy: jasmine.SpyObj<ExecutionApiPort>;
  let stateColorSpy: jasmine.SpyObj<StateColorService>;

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
    localStorage.clear();

    const spy = jasmine.createSpyObj('ExecutionApiPort', ['getHistory']);

    stateColorSpy = jasmine.createSpyObj('StateColorService', ['getColor', 'getOrCreateColors']);
    stateColorSpy.getColor.and.returnValue(null); // default: no colour

    await TestBed.configureTestingModule({
      imports: [ExecutionHistoryComponent],
      providers: [
        { provide: EXECUTION_API_PORT, useValue: spy },
        { provide: StateColorService, useValue: stateColorSpy },
      ],
    }).compileComponents();

    apiServiceSpy = TestBed.inject(EXECUTION_API_PORT) as jasmine.SpyObj<ExecutionApiPort>;
  });

  function createComponent(workflowId?: string): void {
    fixture = TestBed.createComponent(ExecutionHistoryComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('executionId', 'exec-uuid-1');
    if (workflowId !== undefined) {
      fixture.componentRef.setInput('workflowId', workflowId);
    }
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

      const errorEl = fixture.nativeElement.querySelector('we-error-banner');
      expect(errorEl).toBeTruthy();
      expect(errorEl.textContent).toContain('Failed to load execution history.');
    });

    it('should NOT show a retry button (parent handles retry)', () => {
      apiServiceSpy.getHistory.and.returnValue(throwError(() => new Error('API error')));
      createComponent();
      fixture.detectChanges();

      // Error banner should NOT have a retry button (showRetry is false by default)
      const retryBtn = fixture.nativeElement.querySelector('.we-btn--retry');
      expect(retryBtn).toBeFalsy();
    });

    it('should set error signal and emit errorEvent', () => {
      // First load succeeds
      apiServiceSpy.getHistory.and.returnValue(of([]));
      createComponent();
      fixture.detectChanges();

      const emitted: string[] = [];
      const sub = component.errorEvent.subscribe((val) => emitted.push(val));

      // Make the next call fail and trigger a refresh
      apiServiceSpy.getHistory.and.returnValue(throwError(() => new Error('API error')));
      component['historyAsync']()?.refresh();
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
      // Default displayMode is 'vertical' (internal signal)
      fixture.detectChanges();
    });

    it('should render the vertical timeline', () => {
      const timeline = fixture.nativeElement.querySelector('.we-timeline--vertical');
      expect(timeline).toBeTruthy();
    });

    it('should render a transition row for each history item', () => {
      const rows = fixture.nativeElement.querySelectorAll('.we-timeline__transition');
      expect(rows.length).toBe(2); // 2 history items → 2 transition rows
    });

    it('should display fromState → toState in each transition row', () => {
      const rows = fixture.nativeElement.querySelectorAll('.we-timeline__transition');

      // First row: CREATED → IN_REVIEW
      const firstFrom = rows[0].querySelector('.we-timeline__from');
      const firstArrow = rows[0].querySelector('.we-timeline__arrow');
      const firstTo = rows[0].querySelector('.we-timeline__to');
      expect(firstFrom.textContent).toContain('CREATED');
      expect(firstArrow.textContent).toContain('→');
      expect(firstTo.textContent).toContain('IN_REVIEW');

      // Second row: IN_REVIEW → APPROVED
      const secondFrom = rows[1].querySelector('.we-timeline__from');
      const secondTo = rows[1].querySelector('.we-timeline__to');
      expect(secondFrom.textContent).toContain('IN_REVIEW');
      expect(secondTo.textContent).toContain('APPROVED');
    });

    it('should show timestamps on transition rows', () => {
      const timestamps = fixture.nativeElement.querySelectorAll('.we-timeline__timestamp');
      // Each transition row has a timestamp + the current state may not have one
      expect(timestamps.length).toBe(2);
    });

    it('should show connector lines between transitions and before current state', () => {
      const connectors = fixture.nativeElement.querySelectorAll('.we-timeline__connector');
      // 2 transitions → 1 connector between them + 1 before current state = 2
      expect(connectors.length).toBe(2);
    });

    it('should show the current state at the bottom with ▲ indicator', () => {
      const currentNode = fixture.nativeElement.querySelector('.we-timeline__current-node');
      expect(currentNode).toBeTruthy();
      expect(currentNode.textContent).toContain('▲');
      expect(currentNode.textContent).toContain('APPROVED');
      expect(currentNode.textContent).toContain('(current)');
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

    it('should render 1 transition row + current state node', () => {
      const rows = fixture.nativeElement.querySelectorAll('.we-timeline__transition');
      expect(rows.length).toBe(1); // 1 history item → 1 transition

      const currentNode = fixture.nativeElement.querySelector('.we-timeline__current-node');
      expect(currentNode).toBeTruthy();
    });

    it('should show CREATED → IN_REVIEW in transition and IN_REVIEW as current', () => {
      const row = fixture.nativeElement.querySelector('.we-timeline__transition');
      expect(row.querySelector('.we-timeline__from').textContent).toContain('CREATED');
      expect(row.querySelector('.we-timeline__to').textContent).toContain('IN_REVIEW');

      const currentNode = fixture.nativeElement.querySelector('.we-timeline__current-node');
      expect(currentNode.textContent).toContain('IN_REVIEW');
    });
  });

  describe('horizontal mode', () => {
    beforeEach(() => {
      apiServiceSpy.getHistory.and.returnValue(of(mockHistoryItems));
      createComponent();
      fixture.detectChanges();
      // Click the "Condensed" toggle button to switch to horizontal
      const buttons = fixture.nativeElement.querySelectorAll('.we-display-toggle__btn');
      (buttons[1] as HTMLElement)?.click();
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
      fixture.detectChanges();
      // Click the "Condensed" toggle button to switch to horizontal
      const buttons = fixture.nativeElement.querySelectorAll('.we-display-toggle__btn');
      (buttons[1] as HTMLElement)?.click();
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

  describe('display toggle', () => {
    beforeEach(() => {
      apiServiceSpy.getHistory.and.returnValue(of(mockHistoryItems));
      createComponent();
      fixture.detectChanges();
    });

    it('should render toggle buttons when history data is present', () => {
      const toggleGroup = fixture.nativeElement.querySelector('.we-display-toggle');
      expect(toggleGroup).toBeTruthy();

      const buttons = toggleGroup.querySelectorAll('.we-display-toggle__btn');
      expect(buttons.length).toBe(2);
      expect(buttons[0].textContent).toContain('Detail');
      expect(buttons[1].textContent).toContain('Condensed');
    });

    it('should default to vertical mode with Detail button active', () => {
      const buttons = fixture.nativeElement.querySelectorAll('.we-display-toggle__btn');
      expect(buttons[0].classList).toContain('we-display-toggle__btn--active');
      expect(buttons[1].classList).not.toContain('we-display-toggle__btn--active');
      // Vertical timeline should be rendered
      expect(fixture.nativeElement.querySelector('.we-timeline--vertical')).toBeTruthy();
    });

    it('should switch to horizontal mode when Condensed is clicked', () => {
      const buttons = fixture.nativeElement.querySelectorAll('.we-display-toggle__btn');
      const condensedBtn = buttons[1] as HTMLElement;
      condensedBtn.click();
      fixture.detectChanges();

      expect(buttons[0].classList).not.toContain('we-display-toggle__btn--active');
      expect(buttons[1].classList).toContain('we-display-toggle__btn--active');
      // Horizontal timeline should be rendered
      expect(fixture.nativeElement.querySelector('.we-timeline--horizontal')).toBeTruthy();
    });

    it('should switch rendering when toggle is clicked', () => {
      // Default: vertical
      expect(fixture.nativeElement.querySelector('.we-timeline--vertical')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('.we-timeline--horizontal')).toBeFalsy();

      // Switch to horizontal
      const buttons = fixture.nativeElement.querySelectorAll('.we-display-toggle__btn');
      (buttons[1] as HTMLElement).click();
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.we-timeline--vertical')).toBeFalsy();
      expect(fixture.nativeElement.querySelector('.we-timeline--horizontal')).toBeTruthy();

      // Switch back to vertical
      (buttons[0] as HTMLElement).click();
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.we-timeline--vertical')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('.we-timeline--horizontal')).toBeFalsy();
    });

    it('should set aria-pressed correctly on toggle buttons', () => {
      const buttons = fixture.nativeElement.querySelectorAll('.we-display-toggle__btn');
      expect(buttons[0].getAttribute('aria-pressed')).toBe('true');
      expect(buttons[1].getAttribute('aria-pressed')).toBe('false');

      (buttons[1] as HTMLElement).click();
      fixture.detectChanges();

      expect(buttons[0].getAttribute('aria-pressed')).toBe('false');
      expect(buttons[1].getAttribute('aria-pressed')).toBe('true');
    });
  });

  describe('errorEvent output', () => {
    it('should emit errorEvent on API error', () => {
      // First load succeeds
      apiServiceSpy.getHistory.and.returnValue(of([]));
      createComponent();
      fixture.detectChanges();

      const emitted: string[] = [];
      const sub = component.errorEvent.subscribe((val) => emitted.push(val));

      // Make the next call fail and trigger a refresh
      apiServiceSpy.getHistory.and.returnValue(throwError(() => new Error('API error')));
      component['historyAsync']()?.refresh();
      fixture.detectChanges();

      expect(emitted).toEqual(['Failed to load execution history.']);
      sub.unsubscribe();
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  STATE COLOURS
  //  Spy returns rgb strings to avoid browser hex-normalisation.
  // ═══════════════════════════════════════════════════════════

  describe('state colours', () => {
    // State-code → colour mapping used by the spy
    const colorMap: Record<string, string> = {
      created:   'rgb(76, 175, 80)',    // green
      in_review: 'rgb(92, 107, 192)',   // deep purple
      approved:  'rgb(244, 67, 54)',    // red
    };

    function initWithColors(history: HistoryItem[] = mockHistoryItems): void {
      stateColorSpy.getColor.and.callFake(
        (_wfId: string, code: string): string | null => colorMap[code] ?? null,
      );
      apiServiceSpy.getHistory.and.returnValue(of(history));
      createComponent('wf-1');
      fixture.detectChanges();
    }

    // ── Vertical mode ──────────────────────────────────────

    describe('vertical mode', () => {
      it('colours each dot with its toState colour', () => {
        initWithColors();
        const dots = fixture.nativeElement.querySelectorAll(
          '.we-timeline__dot',
        ) as NodeListOf<HTMLElement>;
        // item[0] toState = in_review, item[1] toState = approved
        expect(dots[0].style.color).toBe(colorMap['in_review']);
        expect(dots[1].style.color).toBe(colorMap['approved']);
      });

      it('colours the current indicator with the current state colour', () => {
        initWithColors();
        const indicator = fixture.nativeElement.querySelector(
          '.we-timeline__indicator--current',
        ) as HTMLElement;
        // currentState = last toState = approved
        expect(indicator.style.color).toBe(colorMap['approved']);
      });

      it('does NOT colour fromState or toState text labels', () => {
        initWithColors();
        (fixture.nativeElement.querySelectorAll('.we-timeline__from') as NodeListOf<HTMLElement>)
          .forEach(el => expect(el.style.color).toBe(''));
        (fixture.nativeElement.querySelectorAll('.we-timeline__to') as NodeListOf<HTMLElement>)
          .forEach(el => expect(el.style.color).toBe(''));
      });

      it('applies no dot colour when workflowId is not provided', () => {
        stateColorSpy.getColor.and.returnValue('rgb(92, 107, 192)');
        apiServiceSpy.getHistory.and.returnValue(of(mockHistoryItems));
        createComponent(); // no workflowId → getStateColor returns null
        fixture.detectChanges();
        const dot = fixture.nativeElement.querySelector('.we-timeline__dot') as HTMLElement;
        expect(dot.style.color).toBe('');
      });
    });

    // ── Horizontal mode ────────────────────────────────────

    describe('horizontal mode', () => {
      function switchToHorizontal(): void {
        const buttons = fixture.nativeElement.querySelectorAll('.we-display-toggle__btn');
        (buttons[1] as HTMLElement).click();
        fixture.detectChanges();
      }

      it('colours every step name with its state colour', () => {
        initWithColors();
        switchToHorizontal();
        const names = fixture.nativeElement.querySelectorAll(
          '.we-timeline__step-name',
        ) as NodeListOf<HTMLElement>;
        // 3 steps: created (initial), in_review, approved (current)
        expect(names[0].style.color).toBe(colorMap['created']);
        expect(names[1].style.color).toBe(colorMap['in_review']);
        expect(names[2].style.color).toBe(colorMap['approved']);
      });

      it('adds rgba background-color tint to the current step name', () => {
        initWithColors();
        switchToHorizontal();
        const names = fixture.nativeElement.querySelectorAll(
          '.we-timeline__step-name',
        ) as NodeListOf<HTMLElement>;
        const lastStepName = names[names.length - 1];
        expect(lastStepName.style.backgroundColor).toContain('rgba(');
        expect(lastStepName.style.backgroundColor).toContain('0.08');
      });

      it('does NOT add a background tint to non-current step names', () => {
        initWithColors();
        switchToHorizontal();
        const names = fixture.nativeElement.querySelectorAll(
          '.we-timeline__step-name',
        ) as NodeListOf<HTMLElement>;
        expect(names[0].style.backgroundColor).toBe('');
        expect(names[1].style.backgroundColor).toBe('');
      });

      it('connector arrows are not coloured by the service', () => {
        initWithColors();
        switchToHorizontal();
        (fixture.nativeElement.querySelectorAll(
          '.we-timeline__arrow--horizontal',
        ) as NodeListOf<HTMLElement>).forEach(el => expect(el.style.color).toBe(''));
      });
    });

    // ── Toggle persistence ─────────────────────────────────

    describe('toggle persistence', () => {
      it('colours persist when toggling from vertical to horizontal and back', () => {
        initWithColors();
        const buttons = fixture.nativeElement.querySelectorAll('.we-display-toggle__btn');

        // vertical — dots coloured
        expect(
          (fixture.nativeElement.querySelector('.we-timeline__dot') as HTMLElement).style.color,
        ).not.toBe('');

        // switch to horizontal — step names coloured
        (buttons[1] as HTMLElement).click();
        fixture.detectChanges();
        expect(
          (fixture.nativeElement.querySelector('.we-timeline__step-name') as HTMLElement).style.color,
        ).not.toBe('');

        // back to vertical — dots still coloured
        (buttons[0] as HTMLElement).click();
        fixture.detectChanges();
        expect(
          (fixture.nativeElement.querySelector('.we-timeline__dot') as HTMLElement).style.color,
        ).not.toBe('');
      });
    });

    // ── No colours during loading / error / empty ──────────

    describe('no colours during loading, error, and empty states', () => {
      it('no timeline is rendered while loading', () => {
        const subject = new Subject<HistoryItem[]>();
        apiServiceSpy.getHistory.and.returnValue(subject.asObservable());
        createComponent('wf-1');
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelectorAll('.we-timeline__dot').length).toBe(0);
      });

      it('no timeline is rendered in error state', () => {
        apiServiceSpy.getHistory.and.returnValue(throwError(() => new Error('fail')));
        createComponent('wf-1');
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('.we-timeline--vertical')).toBeFalsy();
      });

      it('no timeline is rendered for empty history', () => {
        apiServiceSpy.getHistory.and.returnValue(of([]));
        createComponent('wf-1');
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('.we-timeline--vertical')).toBeFalsy();
      });
    });
  });
});
