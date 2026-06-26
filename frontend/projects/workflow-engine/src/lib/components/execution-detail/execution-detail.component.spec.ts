import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Subject, of, throwError } from 'rxjs';
import { ExecutionDetailComponent } from './execution-detail.component';
import { EXECUTION_API_PORT, ExecutionApiPort } from '../../services/execution-api.port';
import { StateColorService } from '../../services/state-color.service';
import { ExecutionResponse, NextStatesResponse, TransitionResponse } from '../../models';

describe('ExecutionDetailComponent', () => {
  let component: ExecutionDetailComponent;
  let fixture: ComponentFixture<ExecutionDetailComponent>;
  let apiSpy: jasmine.SpyObj<ExecutionApiPort>;
  let stateColorSpy: jasmine.SpyObj<StateColorService>;

  const executionId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

  const mockExecution: ExecutionResponse = {
    id: executionId,
    workflowId: 'uuid-1',
    currentState: { code: 'in_review', name: 'IN_REVIEW', terminal: false },
  };

  const mockExecutionWithSince: ExecutionResponse = {
    ...mockExecution,
    currentStateSince: '2026-06-19T10:05:00Z',
  };

  const mockNextStates: NextStatesResponse[] = [
    { code: 'approved', name: 'APPROVED' },
    { code: 'rejected', name: 'REJECTED' },
  ];

  const mockTransitionResponse: TransitionResponse = {
    executionId,
    previousStateCode: 'in_review',
    previousStateName: 'IN_REVIEW',
    currentStateCode: 'approved',
    currentStateName: 'APPROVED',
    timestamp: '2026-06-19T12:00:00Z',
  };

  beforeEach(async () => {
    localStorage.clear();

    const spy = jasmine.createSpyObj('ExecutionApiPort', [
      'getExecution',
      'getNextStates',
      'transition',
      'getHistory',
    ]);

    // Default: return empty history so the embedded ExecutionHistoryComponent does not error
    spy.getHistory.and.returnValue(of([]));

    stateColorSpy = jasmine.createSpyObj('StateColorService', ['getColor', 'getOrCreateColors']);
    stateColorSpy.getColor.and.returnValue(null); // default: no colour cached

    await TestBed.configureTestingModule({
      imports: [ExecutionDetailComponent],
      providers: [
        { provide: EXECUTION_API_PORT, useValue: spy },
        { provide: StateColorService, useValue: stateColorSpy },
      ],
    }).compileComponents();

    apiSpy = TestBed.inject(EXECUTION_API_PORT) as jasmine.SpyObj<ExecutionApiPort>;
  });

  /**
   * Helper to create the component, set the input, and optionally run initial detectChanges.
   */
  function createComponent(detectChanges = true): void {
    fixture = TestBed.createComponent(ExecutionDetailComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('executionId', executionId);
    // Do NOT call fixture.detectChanges() here — the caller controls it
  }

  /**
   * Helper that sets up successful mocks for initial load and triggers change detection.
   * After this call the component is fully loaded with mock data.
   */
  function initWithData(
    exec: ExecutionResponse = mockExecution,
    next: NextStatesResponse[] = mockNextStates,
  ): void {
    apiSpy.getExecution.and.returnValue(of(exec));
    apiSpy.getNextStates.and.returnValue(of(next));
    createComponent();
    fixture.detectChanges();
  }

  // ═══════════════════════════════════════════════════════════
  //  LOADING STATE
  // ═══════════════════════════════════════════════════════════

  describe('loading state', () => {
    it('should show skeleton shimmer on mount while data is loading', () => {
      const execSub = new Subject<ExecutionResponse>();
      const nextSub = new Subject<NextStatesResponse[]>();
      apiSpy.getExecution.and.returnValue(execSub.asObservable());
      apiSpy.getNextStates.and.returnValue(nextSub.asObservable());

      createComponent();
      fixture.detectChanges();

      // Skeleton should be visible during loading
      expect(component.loading()).toBeTrue();
      const skeleton = fixture.nativeElement.querySelector('.we-execution-detail__skeleton');
      expect(skeleton).toBeTruthy();
      expect(skeleton.children.length).toBeGreaterThan(0);

      // Data arrives
      execSub.next(mockExecution);
      nextSub.next(mockNextStates);
      execSub.complete();
      nextSub.complete();
      fixture.detectChanges();

      // Skeleton should be gone
      expect(component.loading()).toBeFalse();
      const skeletonAfter = fixture.nativeElement.querySelector('.we-execution-detail__skeleton');
      expect(skeletonAfter).toBeFalsy();
    });

    it('should set loading to false when API call fails', () => {
      apiSpy.getExecution.and.returnValue(throwError(() => new Error('fail')));
      apiSpy.getNextStates.and.returnValue(of([]));

      createComponent();
      fixture.detectChanges();

      expect(component.loading()).toBeFalse();
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  SUCCESS STATE
  // ═══════════════════════════════════════════════════════════

  describe('success state', () => {
    beforeEach(() => {
      initWithData();
    });

    it('should render the truncated execution ID in the header', () => {
      const idEl = fixture.nativeElement.querySelector('.we-execution-detail__id');
      expect(idEl).toBeTruthy();
      expect(idEl.textContent).toContain('Execution #a1b2...');
    });

    it('should render the back button', () => {
      const backBtn = fixture.nativeElement.querySelector('.we-btn--back');
      expect(backBtn).toBeTruthy();
      expect(backBtn.textContent).toContain('← Back');
    });

    it('should render the current state card with the state code', () => {
      const codeEl = fixture.nativeElement.querySelector('.we-state-card__code');
      expect(codeEl).toBeTruthy();
      expect(codeEl.textContent).toContain('in_review');
    });

    it('should render the current state name in the state card', () => {
      const nameEl = fixture.nativeElement.querySelector('.we-state-card__name');
      expect(nameEl).toBeTruthy();
      expect(nameEl.textContent).toContain('IN_REVIEW');
    });

    it('should render transition buttons for each next state', () => {
      const buttons = fixture.nativeElement.querySelectorAll('.we-btn--transition');
      expect(buttons.length).toBe(2);
      expect(buttons[0].textContent).toContain('APPROVED');
      expect(buttons[1].textContent).toContain('REJECTED');
    });

    it('should show arrow prefix on each transition button', () => {
      const arrows = fixture.nativeElement.querySelectorAll('.we-btn__arrow');
      expect(arrows.length).toBe(2);
      arrows.forEach((arrow: HTMLElement) => {
        expect(arrow.textContent).toContain('→');
      });
    });

    it('should show "Available Transitions" section heading', () => {
      const headings = fixture.nativeElement.querySelectorAll('.we-section-title');
      const allHeadings = Array.from(headings) as HTMLElement[];
      const transitionHeading = allHeadings.find(
        (h) => h.textContent?.trim() === 'Available Transitions',
      );
      expect(transitionHeading).toBeTruthy();
    });

    it('should embed the ExecutionHistoryComponent', () => {
      const historyEl = fixture.nativeElement.querySelector('we-execution-history');
      expect(historyEl).toBeTruthy();
    });

    it('should show "History" section heading', () => {
      const headings = fixture.nativeElement.querySelectorAll('.we-section-title');
      const allHeadings = Array.from(headings) as HTMLElement[];
      const historyHeading = allHeadings.find(
        (h) => h.textContent?.trim() === 'History',
      );
      expect(historyHeading).toBeTruthy();
    });

    it('should NOT show skeleton or error when data is loaded', () => {
      const skeleton = fixture.nativeElement.querySelector('.we-execution-detail__skeleton');
      const error = fixture.nativeElement.querySelector('.we-execution-detail__error');
      expect(skeleton).toBeFalsy();
      expect(error).toBeFalsy();
    });

    it('should NOT show terminal banner when current state is not terminal', () => {
      const terminalBanner = fixture.nativeElement.querySelector('.we-execution-detail__terminal');
      expect(terminalBanner).toBeFalsy();
    });

    it('should render the "Since" time when currentStateSince is provided', () => {
      // Re-init with date so we can verify it
      apiSpy.getExecution.and.returnValue(of(mockExecutionWithSince));
      apiSpy.getNextStates.and.returnValue(of(mockNextStates));
      createComponent();
      fixture.detectChanges();

      const sinceEl = fixture.nativeElement.querySelector('.we-state-card__since');
      expect(sinceEl).toBeTruthy();
      expect(sinceEl.textContent).toContain('Since');
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  ERROR STATE (initial load)
  // ═══════════════════════════════════════════════════════════

  describe('error state (initial load)', () => {
    it('should show error message and retry button on API failure', () => {
      apiSpy.getExecution.and.returnValue(throwError(() => new Error('API error')));
      apiSpy.getNextStates.and.returnValue(of([]));

      createComponent();
      fixture.detectChanges();

      const errorEl = fixture.nativeElement.querySelector('we-error-banner');
      expect(errorEl).toBeTruthy();
      expect(errorEl.textContent).toContain('Failed to load execution.');

      const retryBtn = fixture.nativeElement.querySelector('.we-btn--retry');
      expect(retryBtn).toBeTruthy();
    });

    it('should show error message for 404 errors', () => {
      apiSpy.getExecution.and.returnValue(throwError(() => ({ status: 404 })));
      apiSpy.getNextStates.and.returnValue(of([]));

      createComponent();
      fixture.detectChanges();

      const errorEl = fixture.nativeElement.querySelector('we-error-banner');
      expect(errorEl).toBeTruthy();
      expect(errorEl.textContent).toContain('Failed to load execution.');
    });

    it('should set error signal and emit errorEvent on load failure', () => {
      // First load succeeds
      apiSpy.getExecution.and.returnValue(of(mockExecution));
      apiSpy.getNextStates.and.returnValue(of(mockNextStates));
      createComponent();
      fixture.detectChanges();

      const emitted: string[] = [];
      const sub = component.errorEvent.subscribe((val) => emitted.push(val));

      // Make the next call fail and trigger a refresh
      apiSpy.getExecution.and.returnValue(throwError(() => new Error('API error')));
      apiSpy.getNextStates.and.returnValue(of([]));
      component['refresh']();
      fixture.detectChanges();

      expect(component.error()).toBe('Failed to load execution.');
      expect(emitted).toEqual(['Failed to load execution.']);
      sub.unsubscribe();
    });

    it('should hide skeleton and content when in error state', () => {
      apiSpy.getExecution.and.returnValue(throwError(() => new Error('API error')));
      apiSpy.getNextStates.and.returnValue(of([]));

      createComponent();
      fixture.detectChanges();

      const skeleton = fixture.nativeElement.querySelector('.we-execution-detail__skeleton');
      const stateCard = fixture.nativeElement.querySelector('.we-state-card');
      expect(skeleton).toBeFalsy();
      expect(stateCard).toBeFalsy();
    });

    it('should retry loading when retry button is clicked', () => {
      // First call fails
      apiSpy.getExecution.and.returnValue(throwError(() => new Error('fail')));
      apiSpy.getNextStates.and.returnValue(of([]));

      createComponent();
      fixture.detectChanges();

      // Reset spy to return data on second call
      apiSpy.getExecution.and.returnValue(of(mockExecution));
      apiSpy.getNextStates.and.returnValue(of(mockNextStates));

      const retryBtn = fixture.nativeElement.querySelector('.we-btn--retry');
      retryBtn.click();
      fixture.detectChanges();

      // After retry, should show detail instead of error
      expect(component.error()).toBeNull();
      expect(component.loading()).toBeFalse();
      const codeEl = fixture.nativeElement.querySelector('.we-state-card__code');
      expect(codeEl).toBeTruthy();
      expect(codeEl.textContent).toContain('in_review');
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  TRANSITION FLOW
  // ═══════════════════════════════════════════════════════════

  describe('transition flow', () => {
    beforeEach(() => {
      initWithData();
    });

    it('should show spinner and disable button while transition is in progress', () => {
      const transitionSub = new Subject<TransitionResponse>();
      apiSpy.transition.and.returnValue(transitionSub.asObservable());

      // Get the first transition button (APPROVED)
      const buttons = fixture.nativeElement.querySelectorAll('.we-btn--transition');
      const firstBtn = buttons[0];

      firstBtn.click();
      fixture.detectChanges();

      // Button should be disabled and show spinner
      expect(firstBtn.disabled).toBeTrue();
      expect(component.transitioning()).toBe('approved');

      const spinner = firstBtn.querySelector('.we-spinner--small');
      expect(spinner).toBeTruthy();

      // Complete the transition
      apiSpy.getExecution.and.returnValue(of(mockExecution));
      apiSpy.getNextStates.and.returnValue(of(mockNextStates));
      transitionSub.next(mockTransitionResponse);
      transitionSub.complete();
      fixture.detectChanges();

      // Button should be re-enabled
      expect(firstBtn.disabled).toBeFalse();
      expect(component.transitioning()).toBeNull();
    });

    it('should emit transitionExecuted with TransitionResponse on success', () => {
      apiSpy.transition.and.returnValue(of(mockTransitionResponse));
      apiSpy.getExecution.and.returnValue(of(mockExecution));
      apiSpy.getNextStates.and.returnValue(of(mockNextStates));

      const emitted: TransitionResponse[] = [];
      const sub = component.transitionExecuted.subscribe((val) => emitted.push(val));

      const buttons = fixture.nativeElement.querySelectorAll('.we-btn--transition');
      buttons[0].click();
      fixture.detectChanges();

      expect(emitted.length).toBe(1);
      expect(emitted[0]).toEqual(mockTransitionResponse);
      sub.unsubscribe();
    });

    it('should update current state display after successful transition', () => {
      // Set up: after transition, the execution returns the new state
      const updatedExecution: ExecutionResponse = {
        ...mockExecution,
        currentState: { code: 'approved', name: 'APPROVED', terminal: true },
      };
      apiSpy.transition.and.returnValue(of(mockTransitionResponse));
      apiSpy.getExecution.and.returnValue(of(updatedExecution));
      apiSpy.getNextStates.and.returnValue(of([]));

      const buttons = fixture.nativeElement.querySelectorAll('.we-btn--transition');
      buttons[0].click();
      fixture.detectChanges();

      // The execution signal should reflect the new state
      expect(component.execution()?.currentState.code).toBe('approved');
      expect(component.execution()?.currentState.name).toBe('APPROVED');
    });

    it('should reload next states after successful transition', () => {
      const updatedExecution: ExecutionResponse = {
        ...mockExecution,
        currentState: { code: 'approved', name: 'APPROVED', terminal: true },
      };
      apiSpy.transition.and.returnValue(of(mockTransitionResponse));
      apiSpy.getExecution.and.returnValue(of(updatedExecution));
      apiSpy.getNextStates.and.returnValue(of([]));

      const buttons = fixture.nativeElement.querySelectorAll('.we-btn--transition');
      buttons[0].click();
      fixture.detectChanges();

      // Next states should be empty (terminal state)
      expect(component.nextStates().length).toBe(0);
    });

    it('should show inline error and re-enable buttons on transition failure', () => {
      apiSpy.transition.and.returnValue(throwError(() => new Error('Transition failed')));

      const emitted: string[] = [];
      const sub = component.errorEvent.subscribe((val) => emitted.push(val));

      const buttons = fixture.nativeElement.querySelectorAll('.we-btn--transition');
      buttons[0].click();
      fixture.detectChanges();

      // All buttons should be re-enabled
      buttons.forEach((btn: HTMLButtonElement) => {
        expect(btn.disabled).toBeFalse();
      });
      expect(component.transitioning()).toBeNull();

      // Error message should be shown
      const actionError = fixture.nativeElement.querySelector('.we-execution-detail__action-error');
      expect(actionError).toBeTruthy();
      expect(actionError.textContent).toContain('Failed to execute transition.');

      // errorEvent should be emitted
      expect(emitted).toEqual(['Failed to execute transition.']);
      sub.unsubscribe();
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  TERMINAL STATE
  // ═══════════════════════════════════════════════════════════

  describe('terminal state', () => {
    beforeEach(() => {
      const terminalExecution: ExecutionResponse = {
        ...mockExecution,
        currentState: { code: 'approved', name: 'APPROVED', terminal: true },
      };
      initWithData(terminalExecution, []);
    });

    it('should show terminal completion banner when state is terminal', () => {
      const terminalBanner = fixture.nativeElement.querySelector('.we-execution-detail__terminal');
      expect(terminalBanner).toBeTruthy();
      expect(terminalBanner.textContent).toContain('Workflow complete. Final state:');
      expect(terminalBanner.textContent).toContain('APPROVED');
    });

    it('should show checkmark icon in terminal banner', () => {
      const icon = fixture.nativeElement.querySelector('.we-terminal-icon');
      expect(icon).toBeTruthy();
      expect(icon.textContent).toContain('✓');
    });

    it('should hide transition buttons when state is terminal', () => {
      const buttons = fixture.nativeElement.querySelectorAll('.we-btn--transition');
      expect(buttons.length).toBe(0);
    });

    it('should hide current state card when state is terminal', () => {
      const stateCard = fixture.nativeElement.querySelector('.we-state-card');
      expect(stateCard).toBeFalsy();
    });

    it('should still show history section when state is terminal', () => {
      const historySection = fixture.nativeElement.querySelector('.we-execution-detail__history');
      expect(historySection).toBeTruthy();
    });

    it('should not show the "Available Transitions" section heading', () => {
      const headings = fixture.nativeElement.querySelectorAll('.we-section-title');
      const allHeadings = Array.from(headings) as HTMLElement[];
      const transitionHeading = allHeadings.find(
        (h) => h.textContent?.trim() === 'Available Transitions',
      );
      expect(transitionHeading).toBeFalsy();
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  BACK BUTTON
  // ═══════════════════════════════════════════════════════════

  describe('back button', () => {
    beforeEach(() => {
      initWithData();
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

  // ═══════════════════════════════════════════════════════════
  //  TRUNCATED EXECUTION ID
  // ═══════════════════════════════════════════════════════════

  describe('truncated execution ID', () => {
    it('should show first 4 characters for a long UUID', () => {
      // ID is 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
      initWithData();
      expect(component.truncatedId).toBe('a1b2...');
    });

    it('should return full ID when shorter than 8 characters', () => {
      // Override the input with a short ID by creating a new fixture
      apiSpy.getExecution.and.returnValue(of(mockExecution));
      apiSpy.getNextStates.and.returnValue(of(mockNextStates));
      createComponent();
      fixture.componentRef.setInput('executionId', 'short');
      fixture.detectChanges();

      expect(component.truncatedId).toBe('short');
    });

    it('should return full ID when exactly 8 characters', () => {
      apiSpy.getExecution.and.returnValue(of(mockExecution));
      apiSpy.getNextStates.and.returnValue(of(mockNextStates));
      createComponent();
      fixture.componentRef.setInput('executionId', '12345678');
      fixture.detectChanges();

      expect(component.truncatedId).toBe('12345678');
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  ERROR EVENT OUTPUT
  // ═══════════════════════════════════════════════════════════

  describe('errorEvent output', () => {
    it('should emit errorEvent on initial load failure', () => {
      // First load succeeds
      apiSpy.getExecution.and.returnValue(of(mockExecution));
      apiSpy.getNextStates.and.returnValue(of(mockNextStates));
      createComponent();
      fixture.detectChanges();

      const emitted: string[] = [];
      const sub = component.errorEvent.subscribe((val) => emitted.push(val));

      // Make the next call fail and trigger a refresh
      apiSpy.getExecution.and.returnValue(throwError(() => new Error('API error')));
      apiSpy.getNextStates.and.returnValue(of([]));
      component['refresh']();
      fixture.detectChanges();

      expect(emitted).toEqual(['Failed to load execution.']);
      sub.unsubscribe();
    });

    it('should emit errorEvent on transition failure', () => {
      initWithData();

      apiSpy.transition.and.returnValue(throwError(() => new Error('fail')));

      const emitted: string[] = [];
      const sub = component.errorEvent.subscribe((val) => emitted.push(val));

      const buttons = fixture.nativeElement.querySelectorAll('.we-btn--transition');
      buttons[0].click();
      fixture.detectChanges();

      expect(emitted).toEqual(['Failed to execute transition.']);
      sub.unsubscribe();
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  CONTEXT DISPLAY
  // ═══════════════════════════════════════════════════════════

  describe('context display', () => {
    const executionWithContext: ExecutionResponse = {
      ...mockExecution,
      context: { orderId: 'ORD-123', amount: 4500, currency: 'USD', nested: { key: 'val' } },
    };

    it('should show context section when execution has context', () => {
      initWithData(executionWithContext);
      const contextSection = fixture.nativeElement.querySelector('.we-execution-detail__context');
      expect(contextSection).toBeTruthy();
    });

    it('should render "Context" section heading', () => {
      initWithData(executionWithContext);
      const headings = fixture.nativeElement.querySelectorAll('.we-section-title');
      const allHeadings = Array.from(headings) as HTMLElement[];
      const ctxHeading = allHeadings.find((h) => h.textContent?.trim() === 'Context');
      expect(ctxHeading).toBeTruthy();
    });

    it('should render a row for each context key', () => {
      initWithData(executionWithContext);
      const rows = fixture.nativeElement.querySelectorAll('.we-context-row');
      expect(rows.length).toBe(4);
    });

    it('should display sorted context keys in monospace code elements', () => {
      initWithData(executionWithContext);
      const keyCells = fixture.nativeElement.querySelectorAll('.we-context-key code');
      expect(keyCells.length).toBe(4);
      // Keys should be sorted alphabetically
      expect(keyCells[0].textContent).toContain('amount');
      expect(keyCells[1].textContent).toContain('currency');
      expect(keyCells[2].textContent).toContain('nested');
      expect(keyCells[3].textContent).toContain('orderId');
    });

    it('should render simple values inline', () => {
      initWithData(executionWithContext);
      const valueCells = fixture.nativeElement.querySelectorAll('.we-context-value');
      // amount (number) and currency (string) should be inline (no <pre>)
      expect(valueCells[0].textContent).toContain('4500');
      expect(valueCells[1].textContent).toContain('USD');
    });

    it('should render complex values in a <pre> block', () => {
      initWithData(executionWithContext);
      const preBlocks = fixture.nativeElement.querySelectorAll('.we-context-pre');
      // nested object should be rendered as JSON in a <pre>
      expect(preBlocks.length).toBe(1);
      expect(preBlocks[0].textContent).toContain('"key"');
      expect(preBlocks[0].textContent).toContain('"val"');
    });

    it('should not show context section when execution has no context', () => {
      initWithData(); // mockExecution has no context
      const contextSection = fixture.nativeElement.querySelector('.we-execution-detail__context');
      expect(contextSection).toBeFalsy();
    });

    it('should not show context section when context is empty object', () => {
      initWithData({ ...mockExecution, context: {} });
      const contextSection = fixture.nativeElement.querySelector('.we-execution-detail__context');
      expect(contextSection).toBeFalsy();
    });

    it('should not show context section during loading', () => {
      const execSub = new Subject<ExecutionResponse>();
      const nextSub = new Subject<NextStatesResponse[]>();
      apiSpy.getExecution.and.returnValue(execSub.asObservable());
      apiSpy.getNextStates.and.returnValue(nextSub.asObservable());
      createComponent();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.we-execution-detail__context')).toBeFalsy();
    });

    it('should not show context section in error state', () => {
      apiSpy.getExecution.and.returnValue(throwError(() => new Error('fail')));
      apiSpy.getNextStates.and.returnValue(of([]));
      createComponent();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.we-execution-detail__context')).toBeFalsy();
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  EMPTY NEXT STATES
  // ═══════════════════════════════════════════════════════════

  describe('empty next states', () => {
    beforeEach(() => {
      initWithData(mockExecution, []);
    });

    it('should show "No transitions available." when nextStates is empty', () => {
      const emptyText = fixture.nativeElement.querySelector('.we-empty-text');
      expect(emptyText).toBeTruthy();
      expect(emptyText.textContent).toContain('No transitions available.');
    });

    it('should not render any transition buttons when nextStates is empty', () => {
      const buttons = fixture.nativeElement.querySelectorAll('.we-btn--transition');
      expect(buttons.length).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  STATE CARD COLOUR
  // ═══════════════════════════════════════════════════════════

  describe('state card colour', () => {
    it('sets --we-state-color CSS variable on the card when a colour is available', () => {
      stateColorSpy.getColor.and.returnValue('#2196F3');
      initWithData();

      const card = fixture.nativeElement.querySelector('.we-state-card') as HTMLElement;
      expect(card).toBeTruthy();
      expect(card.style.getPropertyValue('--we-state-color').trim()).toBe('#2196F3');
    });

    it('does not set --we-state-color when no colour is cached', () => {
      stateColorSpy.getColor.and.returnValue(null);
      initWithData();

      const card = fixture.nativeElement.querySelector('.we-state-card') as HTMLElement;
      expect(card.style.getPropertyValue('--we-state-color')).toBe('');
    });

    it('calls getColor with the correct workflowId and state code', () => {
      initWithData();

      expect(stateColorSpy.getColor).toHaveBeenCalledWith(
        mockExecution.workflowId,
        mockExecution.currentState.code,
      );
    });

    it('no state card is rendered during loading, so no colour is applied', () => {
      const subject = new Subject<ExecutionResponse>();
      apiSpy.getExecution.and.returnValue(subject.asObservable());
      apiSpy.getNextStates.and.returnValue(of([]));
      createComponent();
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.we-state-card')).toBeFalsy();
    });

    it('no state card is rendered in error state, so no colour is applied', () => {
      apiSpy.getExecution.and.returnValue(throwError(() => new Error('fail')));
      apiSpy.getNextStates.and.returnValue(of([]));
      createComponent();
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.we-state-card')).toBeFalsy();
    });

    it('terminal success banner is unaffected by state card colour', () => {
      stateColorSpy.getColor.and.returnValue('#F44336');
      const terminalExecution: ExecutionResponse = {
        ...mockExecution,
        currentState: { code: 'approved', name: 'APPROVED', terminal: true },
      };
      initWithData(terminalExecution, []);

      const banner = fixture.nativeElement.querySelector('.we-execution-detail__terminal');
      expect(banner).toBeTruthy();
      // The banner element itself carries no --we-state-color inline style
      expect((banner as HTMLElement).style.getPropertyValue('--we-state-color')).toBe('');
    });
  });
});
