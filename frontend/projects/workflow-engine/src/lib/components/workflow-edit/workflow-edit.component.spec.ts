import { ComponentFixture, TestBed, fakeAsync, flush } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { WorkflowEditComponent } from './workflow-edit.component';
import { WORKFLOW_API_PORT, WorkflowApiPort } from '../../services/workflow-api.port';
import { WorkflowDetail, WorkflowEditability, UpdateWorkflowRequest } from '../../models';

describe('WorkflowEditComponent', () => {
  let component: WorkflowEditComponent;
  let fixture: ComponentFixture<WorkflowEditComponent>;
  let apiSpy: jasmine.SpyObj<WorkflowApiPort>;

  const mockWorkflow: WorkflowDetail = {
    id: 'wf-uuid-1',
    name: 'simple-approval',
    states: [
      { code: 'created', name: 'CREATED', terminal: false },
      { code: 'in_review', name: 'IN REVIEW', terminal: false },
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

  const mockEditability: WorkflowEditability = {
    workflowId: 'wf-uuid-1',
    hasExecutions: true,
    executionCount: 3,
    restrictions: {
      renameableStates: ['created', 'in_review'],
      lockedStates: ['approved', 'rejected'],
      lockedReason: 'Referenced by 3 execution(s)',
      canChangeTerminal: false,
      canRemoveStates: false,
      canRenameWorkflow: true,
      canAddStates: true,
      canChangeInitialState: true,
      canAddTransitions: true,
      canRemoveTransitions: true,
    },
  };

  const mockEditabilityNoExecutions: WorkflowEditability = {
    workflowId: 'wf-uuid-1',
    hasExecutions: false,
    executionCount: 0,
    restrictions: {
      renameableStates: ['created', 'in_review', 'approved', 'rejected'],
      lockedStates: [],
      lockedReason: null,
      canChangeTerminal: true,
      canRemoveStates: true,
      canRenameWorkflow: true,
      canAddStates: true,
      canChangeInitialState: true,
      canAddTransitions: true,
      canRemoveTransitions: true,
    },
  };

  beforeEach(async () => {
    const spy = jasmine.createSpyObj('WorkflowApiPort', [
      'getWorkflow',
      'getWorkflowEditability',
      'updateWorkflow',
    ]);

    await TestBed.configureTestingModule({
      imports: [WorkflowEditComponent],
      providers: [
        { provide: WORKFLOW_API_PORT, useValue: spy },
      ],
    }).compileComponents();

    apiSpy = TestBed.inject(WORKFLOW_API_PORT) as jasmine.SpyObj<WorkflowApiPort>;
  });

  /**
   * Helper: create component, set input, set API returns, trigger effect.
   * Must be called inside a fakeAsync test. After this call, the form is populated.
   */
  function initComponent(
    workflow: WorkflowDetail = mockWorkflow,
    editability: WorkflowEditability = mockEditability,
  ): void {
    apiSpy.getWorkflow.and.returnValue(of(workflow));
    apiSpy.getWorkflowEditability.and.returnValue(of(editability));
    fixture = TestBed.createComponent(WorkflowEditComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('workflowId', 'wf-uuid-1');
    fixture.detectChanges();
  }

  describe('loading state', () => {
    it('should show skeleton on mount while data loads', fakeAsync(() => {
      const wfSubject = new Subject<WorkflowDetail>();
      const edSubject = new Subject<WorkflowEditability>();
      apiSpy.getWorkflow.and.returnValue(wfSubject.asObservable());
      apiSpy.getWorkflowEditability.and.returnValue(edSubject.asObservable());

      fixture = TestBed.createComponent(WorkflowEditComponent);
      component = fixture.componentInstance;
      fixture.componentRef.setInput('workflowId', 'wf-uuid-1');

      // First detectChanges triggers the effect
      fixture.detectChanges();

      expect(component.loading()).toBeTrue();
      const skeleton = fixture.nativeElement.querySelector('.we-workflow-edit__skeleton');
      expect(skeleton).toBeTruthy();

      // Resolve data
      wfSubject.next(mockWorkflow);
      wfSubject.complete();
      edSubject.next(mockEditability);
      edSubject.complete();

      flush(); // let subscribe callbacks fire
      fixture.detectChanges();

      expect(component.loading()).toBeFalse();
      const skeletonAfter = fixture.nativeElement.querySelector('.we-workflow-edit__skeleton');
      expect(skeletonAfter).toBeFalsy();
    }));
  });

  describe('load error state', () => {
    it('should show error banner when getWorkflow fails', fakeAsync(() => {
      apiSpy.getWorkflow.and.returnValue(throwError(() => new Error('API error')));
      apiSpy.getWorkflowEditability.and.returnValue(of(mockEditability));

      fixture = TestBed.createComponent(WorkflowEditComponent);
      component = fixture.componentInstance;
      fixture.componentRef.setInput('workflowId', 'wf-uuid-1');
      fixture.detectChanges();
      flush();
      fixture.detectChanges();

      expect(component.loadError()).toBeTruthy();
      const errorEl = fixture.nativeElement.querySelector('we-error-banner');
      expect(errorEl).toBeTruthy();
      const retryBtn = fixture.nativeElement.querySelector('.we-btn--retry');
      expect(retryBtn).toBeTruthy();
    }));

    it('should show error banner when getWorkflowEditability fails', fakeAsync(() => {
      apiSpy.getWorkflow.and.returnValue(of(mockWorkflow));
      apiSpy.getWorkflowEditability.and.returnValue(throwError(() => new Error('API error')));

      fixture = TestBed.createComponent(WorkflowEditComponent);
      component = fixture.componentInstance;
      fixture.componentRef.setInput('workflowId', 'wf-uuid-1');
      fixture.detectChanges();
      flush();
      fixture.detectChanges();

      expect(component.loadError()).toBeTruthy();
    }));
  });

  describe('form populated', () => {
    beforeEach(fakeAsync(() => {
      initComponent();
      flush();
      fixture.detectChanges();
    }));

    it('should populate workflow name', () => {
      const nameInput = fixture.nativeElement.querySelector('#wf-name') as HTMLInputElement;
      expect(nameInput.value).toBe('simple-approval');
    });

    it('should populate 4 state rows (plus header)', () => {
      // .we-dynamic-list[1] = states formArray (4 rows); [0] = states header (1 row)
      const stateList = fixture.nativeElement.querySelectorAll('.we-dynamic-list')[1];
      const stateRows = stateList.querySelectorAll('.we-dynamic-row');
      expect(stateRows.length).toBe(4);
    });

    it('should populate initial state select', () => {
      const select = fixture.nativeElement.querySelector('[formControlName="initialState"]') as HTMLSelectElement;
      expect(select.value).toBe('created');
    });

    it('should populate 3 transitions', () => {
      expect(component.transitions.length).toBe(3);
    });

    it('should show restriction banner when hasExecutions is true', () => {
      const banner = fixture.nativeElement.querySelector('.we-restriction-banner');
      expect(banner).toBeTruthy();
      expect(banner.textContent).toContain('3 execution(s)');
    });

    it('should hide restriction banner when hasExecutions is false', fakeAsync(() => {
      apiSpy.getWorkflow.and.returnValue(of(mockWorkflow));
      apiSpy.getWorkflowEditability.and.returnValue(of(mockEditabilityNoExecutions));
      fixture = TestBed.createComponent(WorkflowEditComponent);
      component = fixture.componentInstance;
      fixture.componentRef.setInput('workflowId', 'wf-uuid-1');
      fixture.detectChanges();
      flush();
      fixture.detectChanges();

      const banner = fixture.nativeElement.querySelector('.we-restriction-banner');
      expect(banner).toBeFalsy();
    }));
  });

  describe('locked states', () => {
    beforeEach(fakeAsync(() => {
      initComponent();
      flush();
      fixture.detectChanges();
    }));

    it('should show lock icon for locked states', () => {
      // Each locked state renders 2 lock icons (one next to Terminal label, one in remove slot)
      const lockIcons = fixture.nativeElement.querySelectorAll('.we-lock-icon');
      expect(lockIcons.length).toBe(4);
    });

    it('should disable terminal checkbox for locked states', () => {
      const checkboxes = fixture.nativeElement.querySelectorAll('input[type="checkbox"]') as NodeListOf<HTMLInputElement>;
      expect(checkboxes.length).toBe(4);
      // approved (index 2) and rejected (index 3) are locked → disabled
      expect(checkboxes[2].disabled).toBeTrue();
      expect(checkboxes[3].disabled).toBeTrue();
      // Non-locked states should be enabled
      expect(checkboxes[0].disabled).toBeFalse();
      expect(checkboxes[1].disabled).toBeFalse();
    });

    it('should not show remove button for locked states (show lock icon instead)', () => {
      // Each locked state renders 2 lock icons (4 total)
      const lockIcons = fixture.nativeElement.querySelectorAll('.we-lock-icon');
      expect(lockIcons.length).toBe(4);
      // State remove buttons: only non-locked states (created, in_review) have them
      // These are inside the state .we-dynamic-list (index 1)
      const stateList = fixture.nativeElement.querySelectorAll('.we-dynamic-list')[1];
      const stateRemoveButtons = stateList.querySelectorAll('button.we-btn-icon');
      expect(stateRemoveButtons.length).toBe(2);
    });
  });

  describe('state code readonly', () => {
    beforeEach(fakeAsync(() => {
      initComponent();
      flush();
      fixture.detectChanges();
    }));

    it('should have all state code inputs as readonly', () => {
      const codeInputs = fixture.nativeElement.querySelectorAll('.we-input--readonly') as NodeListOf<HTMLInputElement>;
      expect(codeInputs.length).toBe(4);
      codeInputs.forEach((input: HTMLInputElement) => {
        expect(input.readOnly).toBeTrue();
      });
    });
  });

  describe('submit', () => {
    beforeEach(fakeAsync(() => {
      initComponent();
      flush();
      fixture.detectChanges();
    }));

    it('should call updateWorkflow with correct request body on submit', () => {
      apiSpy.updateWorkflow.and.returnValue(of({ workflowId: 'wf-uuid-1' }));

      const form = fixture.nativeElement.querySelector('form');
      form.dispatchEvent(new Event('submit'));
      fixture.detectChanges();

      expect(apiSpy.updateWorkflow).toHaveBeenCalledWith(
        'wf-uuid-1',
        jasmine.objectContaining({
          name: 'simple-approval',
          states: jasmine.arrayContaining([
            jasmine.objectContaining({ code: 'created' }),
            jasmine.objectContaining({ code: 'in_review' }),
            jasmine.objectContaining({ code: 'approved' }),
            jasmine.objectContaining({ code: 'rejected' }),
          ]),
        }) as unknown as UpdateWorkflowRequest,
      );
    });

    it('should emit workflowUpdated on successful submit', () => {
      apiSpy.updateWorkflow.and.returnValue(of({ workflowId: 'wf-uuid-1' }));

      const emitted: string[] = [];
      const sub = component.workflowUpdated.subscribe(v => emitted.push(v));

      const form = fixture.nativeElement.querySelector('form');
      form.dispatchEvent(new Event('submit'));
      fixture.detectChanges();

      expect(emitted).toEqual(['wf-uuid-1']);
      sub.unsubscribe();
    });

    it('should show submitting state on button during submit', fakeAsync(() => {
      const subject = new Subject<{ workflowId: string }>();
      apiSpy.updateWorkflow.and.returnValue(subject.asObservable());

      const form = fixture.nativeElement.querySelector('form');
      form.dispatchEvent(new Event('submit'));
      fixture.detectChanges();

      expect(component.submitting()).toBeTrue();
      const submitBtn = fixture.nativeElement.querySelector('.we-btn--submit');
      expect(submitBtn.textContent).toContain('Saving…');

      subject.next({ workflowId: 'wf-uuid-1' });
      subject.complete();
      flush();
      fixture.detectChanges();

      expect(component.submitting()).toBeFalse();
    }));

    it('should show error banner on submit error', fakeAsync(() => {
      apiSpy.updateWorkflow.and.returnValue(throwError(() => new Error('Validation failed')));

      const form = fixture.nativeElement.querySelector('form');
      form.dispatchEvent(new Event('submit'));
      fixture.detectChanges();
      flush();
      fixture.detectChanges();

      expect(component.submitError()).toBe('Validation failed');
      const errorBanner = fixture.nativeElement.querySelector('we-error-banner');
      expect(errorBanner).toBeTruthy();
    }));

    it('should emit errorEvent on submit error', fakeAsync(() => {
      apiSpy.updateWorkflow.and.returnValue(throwError(() => new Error('Validation failed')));

      const emitted: string[] = [];
      const sub = component.errorEvent.subscribe(v => emitted.push(v));

      const form = fixture.nativeElement.querySelector('form');
      form.dispatchEvent(new Event('submit'));
      fixture.detectChanges();
      flush();
      fixture.detectChanges();

      expect(emitted).toEqual(['Validation failed']);
      sub.unsubscribe();
    }));
  });

  describe('cancel', () => {
    beforeEach(fakeAsync(() => {
      initComponent();
      flush();
      fixture.detectChanges();
    }));

    it('should emit cancel event when Cancel button is clicked', () => {
      const emitted: boolean[] = [];
      const sub = component.cancel.subscribe(() => emitted.push(true));

      const cancelBtn = fixture.nativeElement.querySelector('.we-btn--cancel');
      cancelBtn.click();
      fixture.detectChanges();

      expect(emitted).toEqual([true]);
      sub.unsubscribe();
    });
  });

  describe('remove state', () => {
    beforeEach(fakeAsync(() => {
      initComponent();
      flush();
      fixture.detectChanges();
    }));

    it('should allow removing non-locked state', () => {
      const initialCount = component.states.length;
      component.removeState(0);
      fixture.detectChanges();
      expect(component.states.length).toBe(initialCount - 1);
    });

    it('should not remove locked state via isLockedState guard', () => {
      const initialCount = component.states.length;
      component.removeState(2);
      fixture.detectChanges();
      expect(component.states.length).toBe(initialCount);
    });
  });

  describe('add state', () => {
    beforeEach(fakeAsync(() => {
      initComponent();
      flush();
      fixture.detectChanges();
    }));

    it('should add a new state row that is NOT readonly', () => {
      component.addState();
      fixture.detectChanges();

      // Now 5 states: index 4 is the new one
      const codeInputs = fixture.nativeElement.querySelectorAll('.we-dynamic-list[formarrayname="states"] .we-input') as NodeListOf<HTMLInputElement>;
      // Each state has 2 inputs (name + code). State 0-3 are existing, state 4 is new
      // Existing states have .we-input--readonly on code, new state does not
      const readonlyCodeInputs = fixture.nativeElement.querySelectorAll('.we-input--readonly');
      expect(readonlyCodeInputs.length).toBe(4); // 4 existing states still readonly
      expect(component.states.length).toBe(5);
      expect((component as any).isExistingState(component.states.at(4).value.code)).toBeFalse();
    });
  });

  describe('new state auto-complete', () => {
    beforeEach(fakeAsync(() => {
      initComponent();
      flush();
      fixture.detectChanges();
    }));

    it('should auto-complete code from name for new state', fakeAsync(() => {
      component.addState();
      fixture.detectChanges();

      const nameControl = component.states.at(4).get('name')!;
      nameControl.setValue('MY NEW STATE');
      // valueChanges is async even with fakeAsync, need to tick
      flush();
      fixture.detectChanges();

      const codeControl = component.states.at(4).get('code')!;
      expect(codeControl.value).toBe('my_new_state');
    }));

    it('should NOT auto-complete once user manually edits code', fakeAsync(() => {
      component.addState();
      fixture.detectChanges();

      // Mark code as manually edited
      (component as any).onCodeInput(4);
      const nameControl = component.states.at(4).get('name')!;
      nameControl.setValue('MY NEW STATE');
      flush();
      fixture.detectChanges();

      const codeControl = component.states.at(4).get('code')!;
      expect(codeControl.value).not.toBe('my_new_state');
      // Should be empty since we never set it
      expect(codeControl.value).toBe('');
    }));
  });
});
