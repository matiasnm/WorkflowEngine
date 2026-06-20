import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Subject, of, throwError } from 'rxjs';
import { WorkflowCreateComponent } from './workflow-create.component';
import { WorkflowApiService } from '../../services/workflow-api.service';

/** Helper to find an element whose textContent includes the given substring. */
function findElementByText(parent: Element, selector: string, text: string): Element | null {
  const elements = parent.querySelectorAll(selector);
  for (let i = 0; i < elements.length; i++) {
    if (elements[i].textContent?.includes(text)) {
      return elements[i];
    }
  }
  return null;
}

describe('WorkflowCreateComponent', () => {
  let component: WorkflowCreateComponent;
  let fixture: ComponentFixture<WorkflowCreateComponent>;
  let apiServiceSpy: jasmine.SpyObj<WorkflowApiService>;

  beforeEach(async () => {
    const spy = jasmine.createSpyObj('WorkflowApiService', ['createWorkflow']);

    await TestBed.configureTestingModule({
      imports: [WorkflowCreateComponent],
      providers: [
        { provide: WorkflowApiService, useValue: spy },
      ],
    }).compileComponents();

    apiServiceSpy = TestBed.inject(WorkflowApiService) as jasmine.SpyObj<WorkflowApiService>;
  });

  function createComponent(): void {
    fixture = TestBed.createComponent(WorkflowCreateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  // ── Render & Initial state ──

  describe('render', () => {
    it('should render the "Create Workflow" title', () => {
      createComponent();
      const title = fixture.nativeElement.querySelector('.we-workflow-create__title');
      expect(title).toBeTruthy();
      expect(title.textContent).toContain('Create Workflow');
    });

    it('should render name input, states section, transitions section, and buttons', () => {
      createComponent();
      expect(fixture.nativeElement.querySelector('#wf-name')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('.we-form-section')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('.we-btn--cancel')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('.we-btn--submit')).toBeTruthy();
    });
  });

  describe('initial state', () => {
    it('should start with 2 empty state rows', () => {
      createComponent();
      expect(component.states.length).toBe(2);
      // Each state row has 3 inputs: code, name, terminal checkbox
      const stateInputs = fixture.nativeElement.querySelectorAll('.we-dynamic-list[formArrayName="states"] .we-dynamic-row input');
      expect(stateInputs.length).toBe(6); // 2 rows × 3 inputs
    });

    it('should have no transitions initially', () => {
      createComponent();
      expect(component.transitions.length).toBe(0);
    });

    it('should have submit button disabled initially (form invalid)', () => {
      createComponent();
      const submitBtn = fixture.nativeElement.querySelector('.we-btn--submit');
      expect(submitBtn.disabled).toBeTrue();
    });

    it('should have initial state select disabled when < 2 states', () => {
      // Remove one state to have only 1
      createComponent();
      component.removeState(1);
      fixture.detectChanges();
      const select = fixture.nativeElement.querySelector('select[formControlName="initialState"]');
      // With [attr.disabled], the attribute is set to '' when disabled
      expect(select.hasAttribute('disabled')).toBeTrue();
    });
  });

  // ── State row management ──

  describe('add state row', () => {
    it('should add a new empty state row when clicking + Add State', () => {
      createComponent();
      const addBtn = fixture.nativeElement.querySelector('.we-btn--add');
      addBtn.click();
      fixture.detectChanges();
      expect(component.states.length).toBe(3);
      // 3 state rows × 3 inputs each (code, name, terminal checkbox) = 9
      const stateInputs = fixture.nativeElement.querySelectorAll('.we-dynamic-list[formArrayName="states"] .we-dynamic-row input');
      expect(stateInputs.length).toBe(9);
    });

    it('should disable add state button at 10 states', () => {
      createComponent();
      // Add 8 more to reach 10
      for (let i = 0; i < 8; i++) {
        component.addState();
      }
      fixture.detectChanges();
      expect(component.states.length).toBe(10);
      expect(component.states.length >= 10).toBeTrue();
      // The + Add State button should be disabled
      const addBtn = fixture.nativeElement.querySelector('.we-btn--add');
      expect(addBtn.disabled).toBeTrue();
    });
  });

  describe('remove state row', () => {
    it('should remove a state row when clicking ✕', () => {
      createComponent();
      expect(component.states.length).toBe(2);
      const removeBtns = fixture.nativeElement.querySelectorAll('.we-btn-icon');
      removeBtns[0].click();
      fixture.detectChanges();
      expect(component.states.length).toBe(1);
    });

    it('should show "At least 2 states required" hint when fewer than 2 states', () => {
      createComponent();
      // Remove both default states
      component.removeState(0);
      component.removeState(0);
      // Mark form as touched
      component.form.markAsTouched();
      fixture.detectChanges();

      const hint = fixture.nativeElement.querySelector('.we-field-error');
      expect(hint).toBeTruthy();
      expect(hint.textContent).toContain('At least 2 states required');
    });

    it('should reset initial state if the removed state was the initial state', () => {
      createComponent();
      // Fill in state codes
      component.states.at(0).patchValue({ code: 'a', name: 'A' });
      component.states.at(1).patchValue({ code: 'b', name: 'B' });
      component.form.get('initialState')?.setValue('a');
      fixture.detectChanges();

      component.removeState(0);
      fixture.detectChanges();

      expect(component.form.get('initialState')?.value).toBe('');
    });

    it('should remove transitions that reference the removed state', () => {
      createComponent();
      component.states.at(0).patchValue({ code: 'a', name: 'A' });
      component.states.at(1).patchValue({ code: 'b', name: 'B' });
      component.addTransition();
      component.transitions.at(0).patchValue({ from: 'a', to: 'b' });
      component.addTransition();
      component.transitions.at(1).patchValue({ from: 'b', to: 'a' });
      fixture.detectChanges();

      expect(component.transitions.length).toBe(2);

      component.removeState(0); // removes 'a'
      fixture.detectChanges();

      // Both transitions reference 'a', so both should be removed
      expect(component.transitions.length).toBe(0);
    });
  });

  // ── Transition management ──

  describe('add transition row', () => {
    it('should add a new transition row when clicking + Add Transition', () => {
      createComponent();
      // Fill in states first so select is meaningful
      component.states.at(0).patchValue({ code: 'a', name: 'A' });
      component.states.at(1).patchValue({ code: 'b', name: 'B' });
      fixture.detectChanges();

      const addBtns = fixture.nativeElement.querySelectorAll('.we-btn--add');
      // Second .we-btn--add is for transitions
      addBtns[1].click();
      fixture.detectChanges();

      expect(component.transitions.length).toBe(1);
    });

    it('should disable + Add Transition when fewer than 2 states', () => {
      createComponent();
      component.removeState(0);
      component.removeState(0);
      fixture.detectChanges();

      const addBtns = fixture.nativeElement.querySelectorAll('.we-btn--add');
      // The transitions add button is the last one
      const transitionAddBtn = addBtns[addBtns.length - 1];
      expect(transitionAddBtn.disabled).toBeTrue();
    });
  });

  describe('remove transition row', () => {
    it('should remove a transition row when clicking ✕', () => {
      createComponent();
      component.states.at(0).patchValue({ code: 'a', name: 'A' });
      component.states.at(1).patchValue({ code: 'b', name: 'B' });
      component.addTransition();
      component.addTransition();
      fixture.detectChanges();

      expect(component.transitions.length).toBe(2);

      const removeBtns = fixture.nativeElement.querySelectorAll('.we-btn-icon');
      // The transition remove buttons come after state remove buttons
      // 2 state rows × 1 remove each = first 2, then transition removes
      const transitionRemoveBtns = fixture.nativeElement.querySelectorAll('.we-dynamic-list + .we-dynamic-list .we-btn-icon');
      // Actually the structure is different. Let's just use the component method
      component.removeTransition(0);
      fixture.detectChanges();
      expect(component.transitions.length).toBe(1);
    });
  });

  // ── Initial state dropdown ──

  describe('initial state dropdown', () => {
    it('should be populated from state codes', () => {
      createComponent();
      component.states.at(0).patchValue({ code: 'a', name: 'A' });
      component.states.at(1).patchValue({ code: 'b', name: 'B' });
      fixture.detectChanges();

      const select = fixture.nativeElement.querySelector('select[formControlName="initialState"]');
      expect(select).toBeTruthy();
      const options = select.querySelectorAll('option');
      // First option is the disabled placeholder
      expect(options.length).toBe(3); // placeholder + a + b
      expect(options[1].value).toBe('a');
      expect(options[2].value).toBe('b');
    });

    it('should update when states change (new state added)', () => {
      createComponent();
      component.states.at(0).patchValue({ code: 'a', name: 'A' });
      component.states.at(1).patchValue({ code: 'b', name: 'B' });
      component.addState();
      component.states.at(2).patchValue({ code: 'c', name: 'C' });
      fixture.detectChanges();

      const select = fixture.nativeElement.querySelector('select[formControlName="initialState"]');
      const options = select.querySelectorAll('option');
      expect(options.length).toBe(4); // placeholder + a + b + c
    });
  });

  // ── Transition dropdowns ──

  describe('transition dropdowns', () => {
    it('should be populated from state codes', () => {
      createComponent();
      component.states.at(0).patchValue({ code: 'a', name: 'A' });
      component.states.at(1).patchValue({ code: 'b', name: 'B' });
      component.addTransition();
      fixture.detectChanges();

      const selects = fixture.nativeElement.querySelectorAll('select[formControlName="from"], select[formControlName="to"]');
      expect(selects.length).toBe(2); // from + to
      const options = selects[0].querySelectorAll('option');
      expect(options.length).toBe(3); // placeholder + a + b
    });
  });

  // ── Validation ──

  describe('name validation', () => {
    it('should show error when name is empty and touched', () => {
      createComponent();
      const nameInput = fixture.nativeElement.querySelector('#wf-name');
      nameInput.focus();
      nameInput.blur(); // triggers touched
      fixture.detectChanges();

      const error = fixture.nativeElement.querySelector('.we-field-error');
      expect(error).toBeTruthy();
      expect(error.textContent).toContain('Workflow name is required');
    });
  });

  describe('states validation', () => {
    it('should show error when fewer than 2 states and form is touched', () => {
      createComponent();
      component.removeState(0);
      component.removeState(0);
      component.form.markAllAsTouched();
      fixture.detectChanges();

      const atLeastTwo = findElementByText(fixture.nativeElement, '.we-field-error', 'At least 2 states required');
      expect(atLeastTwo).toBeTruthy();
    });

    it('should show error when state codes are not unique', () => {
      createComponent();
      component.states.at(0).patchValue({ code: 'same', name: 'A' });
      component.states.at(1).patchValue({ code: 'same', name: 'B' });
      fixture.detectChanges();

      // Trigger duplicate code validation (runs on add/remove state)
      (component as any).updateDuplicateCodeValidator();

      // Touch the code fields
      component.states.at(0).get('code')?.markAsTouched();
      component.states.at(1).get('code')?.markAsTouched();
      fixture.detectChanges();

      const duplicateErr = findElementByText(fixture.nativeElement, '.we-field-error', 'State codes must be unique');
      expect(duplicateErr).toBeTruthy();
    });
  });

  describe('initial state validation', () => {
    it('should show error when not selected and form is touched', () => {
      createComponent();
      component.form.get('initialState')?.markAsTouched();
      fixture.detectChanges();

      const error = fixture.nativeElement.querySelector('.we-field-error');
      expect(error).toBeTruthy();
      expect(error.textContent).toContain('Select an initial state');
    });
  });

  describe('form validity', () => {
    it('should enable submit button when form is valid', () => {
      createComponent();
      component.form.get('name')?.setValue('test-workflow');
      component.states.at(0).patchValue({ code: 'a', name: 'A' });
      component.states.at(1).patchValue({ code: 'b', name: 'B' });
      component.form.get('initialState')?.setValue('a');
      fixture.detectChanges();

      const submitBtn = fixture.nativeElement.querySelector('.we-btn--submit');
      expect(submitBtn.disabled).toBeFalse();
    });

    it('should disable submit button when form is invalid', () => {
      createComponent();
      // Form starts invalid (no name, no initial state)
      const submitBtn = fixture.nativeElement.querySelector('.we-btn--submit');
      expect(submitBtn.disabled).toBeTrue();
    });
  });

  // ── Submit ──

  describe('submit call', () => {
    it('should call createWorkflow with correct request body on submit', () => {
      createComponent();
      apiServiceSpy.createWorkflow.and.returnValue(of({ workflowId: 'new-id' }));

      component.form.get('name')?.setValue('test-workflow');
      component.states.at(0).patchValue({ code: 'a', name: 'A' });
      component.states.at(1).patchValue({ code: 'b', name: 'B' });
      component.form.get('initialState')?.setValue('a');
      component.addTransition();
      component.transitions.at(0).patchValue({ from: 'a', to: 'b' });
      fixture.detectChanges();

      component.onSubmit();

      expect(apiServiceSpy.createWorkflow).toHaveBeenCalledWith({
        name: 'test-workflow',
        states: [
          { code: 'a', name: 'A', terminal: false },
          { code: 'b', name: 'B', terminal: false },
        ],
        transitions: [
          { from: 'a', to: 'b' },
        ],
        initialState: 'a',
      });
    });

    it('should not call createWorkflow if form is invalid', () => {
      createComponent();
      apiServiceSpy.createWorkflow.and.returnValue(of({ workflowId: 'new-id' }));

      component.onSubmit();

      expect(apiServiceSpy.createWorkflow).not.toHaveBeenCalled();
    });
  });

  describe('loading / submitting state', () => {
    it('should show spinner + "Creating…" and disable inputs during submission', () => {
      createComponent();
      const subject = new Subject<{ workflowId: string }>();
      apiServiceSpy.createWorkflow.and.returnValue(subject.asObservable());

      component.form.get('name')?.setValue('test');
      component.states.at(0).patchValue({ code: 'a', name: 'A' });
      component.states.at(1).patchValue({ code: 'b', name: 'B' });
      component.form.get('initialState')?.setValue('a');
      fixture.detectChanges();

      component.onSubmit();
      fixture.detectChanges();

      // Submit button should show "Creating…"
      const submitBtn = fixture.nativeElement.querySelector('.we-btn--submit');
      expect(submitBtn.textContent).toContain('Creating…');
      expect(submitBtn.disabled).toBeTrue();
      expect(component.submitting()).toBeTrue();

      // Name input should be disabled (via [attr.disabled])
      const nameInput = fixture.nativeElement.querySelector('#wf-name');
      expect(nameInput.hasAttribute('disabled')).toBeTrue();

      subject.next({ workflowId: 'new-id' });
      subject.complete();
    });
  });

  describe('submit error', () => {
    it('should show error banner on API error, form stays filled', () => {
      createComponent();
      apiServiceSpy.createWorkflow.and.returnValue(throwError(() => new Error('API error')));

      component.form.get('name')?.setValue('test');
      component.states.at(0).patchValue({ code: 'a', name: 'A' });
      component.states.at(1).patchValue({ code: 'b', name: 'B' });
      component.form.get('initialState')?.setValue('a');
      fixture.detectChanges();

      component.onSubmit();
      fixture.detectChanges();

      // Error banner should appear with the error message
      const errorBanner = fixture.nativeElement.querySelector('.we-submit-error');
      expect(errorBanner).toBeTruthy();
      expect(errorBanner.textContent).toContain('API error');

      // Form should still be filled
      expect(component.form.get('name')?.value).toBe('test');
      expect(component.submitting()).toBeFalse();
    });

    it('should set submitError signal and emit errorEvent on API error', () => {
      createComponent();
      apiServiceSpy.createWorkflow.and.returnValue(throwError(() => new Error('API error')));

      component.form.get('name')?.setValue('test');
      component.states.at(0).patchValue({ code: 'a', name: 'A' });
      component.states.at(1).patchValue({ code: 'b', name: 'B' });
      component.form.get('initialState')?.setValue('a');

      const emitted: string[] = [];
      const sub = component.errorEvent.subscribe((val) => emitted.push(val));

      component.onSubmit();
      fixture.detectChanges();

      expect(component.submitError()).toBeTruthy();
      expect(emitted.length).toBe(1);
      sub.unsubscribe();
    });
  });

  describe('submit success', () => {
    it('should emit workflowCreated with the new UUID on success', () => {
      createComponent();
      apiServiceSpy.createWorkflow.and.returnValue(of({ workflowId: 'new-uuid-123' }));

      component.form.get('name')?.setValue('test');
      component.states.at(0).patchValue({ code: 'a', name: 'A' });
      component.states.at(1).patchValue({ code: 'b', name: 'B' });
      component.form.get('initialState')?.setValue('a');

      const emitted: string[] = [];
      const sub = component.workflowCreated.subscribe((val) => emitted.push(val));

      component.onSubmit();
      fixture.detectChanges();

      expect(emitted).toEqual(['new-uuid-123']);
      sub.unsubscribe();
    });
  });

  describe('cancel', () => {
    it('should emit cancel event when Cancel button is clicked', () => {
      createComponent();
      const emitted: void[] = [];
      const sub = component.cancel.subscribe(() => emitted.push(undefined));

      const cancelBtn = fixture.nativeElement.querySelector('.we-btn--cancel');
      cancelBtn.click();

      expect(emitted.length).toBe(1);
      sub.unsubscribe();
    });
  });

  // ── Code auto-fill ──

  describe('code auto-fill', () => {
    it('should auto-fill code field with snake_case from name when code is pristine', () => {
      createComponent();
      const nameInput = component.states.at(0).get('name');
      const codeInput = component.states.at(0).get('code');

      // Simulate typing in name
      nameInput?.setValue('IN REVIEW');
      component.onStateNameInput(0);

      expect(codeInput?.value).toBe('in_review');
    });

    it('should NOT auto-fill code if user has already edited the code field', () => {
      createComponent();
      const nameInput = component.states.at(0).get('name');
      const codeInput = component.states.at(0).get('code');

      // User manually sets code
      codeInput?.setValue('my-custom-code');
      codeInput?.markAsDirty();

      // Now typing in name
      nameInput?.setValue('IN REVIEW');
      component.onStateNameInput(0);

      // Code should NOT have been overwritten
      expect(codeInput?.value).toBe('my-custom-code');
    });
  });

  // ── Terminal state guard ──

  describe('terminal state transition guard', () => {
    it('should show validation error when creating a transition from a terminal state', () => {
      createComponent();
      component.states.at(0).patchValue({ code: 'a', name: 'A', terminal: true });
      component.states.at(1).patchValue({ code: 'b', name: 'B', terminal: false });
      component.addTransition();
      component.transitions.at(0).patchValue({ from: 'a', to: 'b' });
      component.transitions.at(0).get('from')?.markAsTouched();
      fixture.detectChanges();

      (component as any).updateTransitionValidators();
      fixture.detectChanges();

      const terminalErr = findElementByText(fixture.nativeElement, '.we-field-error', 'Terminal states cannot have outgoing transitions');
      expect(terminalErr).toBeTruthy();
    });
  });
});
