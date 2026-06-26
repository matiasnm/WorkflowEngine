import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Subject, of, throwError } from 'rxjs';
import { StartExecutionComponent } from './start-execution.component';
import { EXECUTION_API_PORT, ExecutionApiPort } from '../../services/execution-api.port';

describe('StartExecutionComponent', () => {
  let component: StartExecutionComponent;
  let fixture: ComponentFixture<StartExecutionComponent>;
  let executionApiSpy: jasmine.SpyObj<ExecutionApiPort>;

  beforeEach(async () => {
    const execSpy = jasmine.createSpyObj('ExecutionApiPort', ['startExecution']);

    await TestBed.configureTestingModule({
      imports: [StartExecutionComponent],
      providers: [
        { provide: EXECUTION_API_PORT, useValue: execSpy },
      ],
    }).compileComponents();

    executionApiSpy = TestBed.inject(EXECUTION_API_PORT) as jasmine.SpyObj<ExecutionApiPort>;
  });

  function createComponent(): void {
    fixture = TestBed.createComponent(StartExecutionComponent);
    component = fixture.componentInstance;
    component.workflowId = 'uuid-1';
    fixture.detectChanges();
  }

  it('should create', () => {
    createComponent();
    expect(component).toBeTruthy();
  });

  it('should show Start Execution button with correct label', () => {
    createComponent();
    const startBtn = fixture.nativeElement.querySelector('.we-btn--start');
    expect(startBtn).toBeTruthy();
    expect(startBtn.textContent).toContain('▶ Start Execution');
  });

  it('should show spinner and disable button while starting execution', () => {
    const subject = new Subject<{ executionId: string }>();
    executionApiSpy.startExecution.and.returnValue(subject.asObservable());
    createComponent();

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
    createComponent();

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
    createComponent();

    const emitted: string[] = [];
    const sub = component.errorEvent.subscribe((val) => emitted.push(val));

    const startBtn = fixture.nativeElement.querySelector('.we-btn--start');
    startBtn.click();
    fixture.detectChanges();

    // Button should be re-enabled
    expect(startBtn.disabled).toBeFalse();
    expect(component.startingExecution()).toBeFalse();

    // Error message should be shown
    const errorEl = fixture.nativeElement.querySelector('we-error-banner');
    expect(errorEl).toBeTruthy();
    expect(errorEl.textContent).toContain('Failed to start execution.');

    // errorEvent should be emitted
    expect(emitted).toEqual(['Failed to start execution.']);
    sub.unsubscribe();
  });

  it('should clear previous error on new start attempt', () => {
    // First call fails
    executionApiSpy.startExecution.and.returnValue(throwError(() => new Error('API error')));
    createComponent();

    const startBtn = fixture.nativeElement.querySelector('.we-btn--start');
    startBtn.click();
    fixture.detectChanges();

    // Error should be visible
    let errorEl = fixture.nativeElement.querySelector('we-error-banner');
    expect(errorEl).toBeTruthy();

    // Second call succeeds
    executionApiSpy.startExecution.and.returnValue(of({ executionId: 'exec-uuid-456' }));
    startBtn.click();
    fixture.detectChanges();

    // Error should be cleared
    errorEl = fixture.nativeElement.querySelector('we-error-banner');
    expect(errorEl).toBeFalsy();
    expect(component.executionError()).toBeNull();
  });

  // ═══════════════════════════════════════════════════════════
  //  CONTEXT EDITOR
  // ═══════════════════════════════════════════════════════════

  describe('context editor', () => {
    it('should have a toggle button to show/hide the context editor', () => {
      createComponent();
      const toggleBtn = fixture.nativeElement.querySelector('.we-btn--context-toggle');
      expect(toggleBtn).toBeTruthy();
      expect(toggleBtn.textContent).toContain('+ Add Context');
    });

    it('should show the context textarea when toggle is clicked', () => {
      createComponent();
      expect(fixture.nativeElement.querySelector('#context-input')).toBeFalsy();

      const toggleBtn = fixture.nativeElement.querySelector('.we-btn--context-toggle');
      toggleBtn.click();
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('#context-input')).toBeTruthy();
      expect(toggleBtn.textContent).toContain('− Hide Context');
    });

    it('should pass entered JSON context to startExecution', () => {
      createComponent();
      const toggleBtn = fixture.nativeElement.querySelector('.we-btn--context-toggle');
      toggleBtn.click();
      fixture.detectChanges();

      const textarea = fixture.nativeElement.querySelector('#context-input') as HTMLTextAreaElement;
      textarea.value = '{"orderId":"ORD-123","amount":4500}';
      textarea.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      expect(component.contextParseError()).toBeNull();

      const startBtn = fixture.nativeElement.querySelector('.we-btn--start');
      startBtn.click();
      fixture.detectChanges();

      expect(executionApiSpy.startExecution).toHaveBeenCalledWith(
        'uuid-1',
        { orderId: 'ORD-123', amount: 4500 },
      );
    });

    it('should show parse error for invalid JSON', () => {
      createComponent();
      const toggleBtn = fixture.nativeElement.querySelector('.we-btn--context-toggle');
      toggleBtn.click();
      fixture.detectChanges();

      const textarea = fixture.nativeElement.querySelector('#context-input') as HTMLTextAreaElement;
      textarea.value = '{invalid json}';
      textarea.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      expect(component.contextParseError()).toBe('Invalid JSON');
      const errorEl = fixture.nativeElement.querySelector('.we-context-editor__error');
      expect(errorEl).toBeTruthy();
      expect(errorEl.textContent).toContain('Invalid JSON');
    });

    it('should not pass context when textarea is empty', () => {
      createComponent();
      const toggleBtn = fixture.nativeElement.querySelector('.we-btn--context-toggle');
      toggleBtn.click();
      fixture.detectChanges();

      const startBtn = fixture.nativeElement.querySelector('.we-btn--start');
      startBtn.click();
      fixture.detectChanges();

      expect(executionApiSpy.startExecution).toHaveBeenCalledWith('uuid-1', undefined);
    });

    it('should use programmatic @Input() context when provided', () => {
      createComponent();
      const ctx = { orderId: 'PROG-123' };
      fixture.componentRef.setInput('context', ctx);
      fixture.detectChanges();

      // Editor should be hidden when programmatic context is provided
      const toggleBtn = fixture.nativeElement.querySelector('.we-btn--context-toggle');
      expect(toggleBtn).toBeFalsy();

      const startBtn = fixture.nativeElement.querySelector('.we-btn--start');
      startBtn.click();
      fixture.detectChanges();

      expect(executionApiSpy.startExecution).toHaveBeenCalledWith('uuid-1', ctx);
    });
  });
});
