import { Component, Output, EventEmitter, signal, inject } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { WorkflowApiService } from '../../services/workflow-api.service';
import { CreateWorkflowRequest } from '../../models';

interface StateFormValue {
  code: string;
  name: string;
  terminal: boolean;
}

interface TransitionFormValue {
  from: string;
  to: string;
}

function toSnakeCase(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

@Component({
  selector: 'we-workflow-create',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="we-workflow-create">
      <!-- Header -->
      <div class="we-workflow-create__header">
        <h2 class="we-workflow-create__title">Create Workflow</h2>
      </div>

      <form [formGroup]="form" (ngSubmit)="onSubmit()" novalidate>
        <!-- Name field -->
        <div class="we-form-group">
          <label class="we-label" for="wf-name">Workflow Name</label>
          <input
            id="wf-name"
            class="we-input"
            [class.we-input--error]="nameInvalid()"
            formControlName="name"
            placeholder="e.g. simple-approval"
            autocomplete="off"
            [attr.disabled]="submitting() ? '' : null"
          />
          @if (nameInvalid(); as errMsg) {
            <span class="we-field-error">{{ errMsg }}</span>
          }
        </div>

        <!-- States section -->
        <section class="we-form-section">
          <div class="we-form-section__header">
            <h3 class="we-form-section__title">States ({{ states.length }})</h3>
          </div>

          @if (states.length > 0) {
            <div class="we-dynamic-list we-dynamic-list--headers">
              <div class="we-dynamic-row we-dynamic-row--header">
                <span class="we-dynamic-header">Code</span>
                <span class="we-dynamic-header">Name</span>
                <span class="we-dynamic-header we-dynamic-header--terminal">Terminal</span>
                <span class="we-dynamic-header we-dynamic-header--remove"></span>
              </div>
            </div>
          }

          <div class="we-dynamic-list" formArrayName="states">
            @for (state of states.controls; track state; let i = $index) {
              <div class="we-dynamic-row" [formGroupName]="i">
                <input
                  class="we-input"
                  [class.we-input--error]="state.get('code')?.invalid && state.get('code')?.touched"
                  formControlName="code"
                  placeholder="e.g. in_review"
                  autocomplete="off"
                  [attr.aria-label]="'State ' + (i + 1) + ' code'"
                  [attr.disabled]="submitting() ? '' : null"
                />
                <input
                  class="we-input"
                  [class.we-input--error]="state.get('name')?.invalid && state.get('name')?.touched"
                  formControlName="name"
                  placeholder="e.g. IN REVIEW"
                  autocomplete="off"
                  [attr.aria-label]="'State ' + (i + 1) + ' name'"
                  (input)="onStateNameInput(i)"
                  [attr.disabled]="submitting() ? '' : null"
                />
                <label class="we-checkbox-label">
                  <input
                    type="checkbox"
                    formControlName="terminal"
                    [attr.aria-label]="'State ' + (i + 1) + ' terminal'"
                    [attr.disabled]="submitting() ? '' : null"
                  />
                  Terminal
                </label>
                <button
                  type="button"
                  class="we-btn-icon"
                  (click)="removeState(i)"
                  [attr.aria-label]="'Remove state ' + (i + 1)"
                >
                  ✕
                </button>
              </div>
              @if (state.get('code')?.errors?.['duplicateCode'] && state.get('code')?.touched) {
                <div class="we-field-error we-field-error--row">
                  State codes must be unique
                </div>
              }
            }
          </div>

          <button
            type="button"
            class="we-btn we-btn--add"
            (click)="addState()"
            [disabled]="states.length >= 10 || submitting()"
          >
            + Add State
          </button>

          @if (states.length < 2 && form.touched) {
            <span class="we-field-error">At least 2 states required.</span>
          }
        </section>

        <!-- Initial State section -->
        <section class="we-form-section">
          <h3 class="we-form-section__title">Initial State</h3>
          <select
            class="we-select"
            [class.we-input--error]="initialStateInvalid()"
            formControlName="initialState"
            [attr.disabled]="(states.length < 2 || submitting()) ? '' : null"
          >
            <option value="" disabled>Select initial state...</option>
            @for (s of states.controls; track s) {
              <option [value]="s.value.code">{{ s.value.name || s.value.code }}</option>
            }
          </select>
          @if (initialStateInvalid(); as errMsg) {
            <span class="we-field-error">{{ errMsg }}</span>
          }
        </section>

        <!-- Transitions section -->
        <section class="we-form-section">
          <div class="we-form-section__header">
            <h3 class="we-form-section__title">Transitions ({{ transitions.length }})</h3>
          </div>

          @if (transitions.length > 0) {
            <div class="we-dynamic-list we-dynamic-list--headers">
              <div class="we-dynamic-row we-dynamic-row--header">
                <span class="we-dynamic-header">From</span>
                <span class="we-dynamic-header we-dynamic-header--arrow"></span>
                <span class="we-dynamic-header">To</span>
                <span class="we-dynamic-header we-dynamic-header--remove"></span>
              </div>
            </div>
          }

          <div class="we-dynamic-list" formArrayName="transitions">
            @for (t of transitions.controls; track t; let i = $index) {
              <div class="we-dynamic-row" [formGroupName]="i">
                <select
                  class="we-select"
                  formControlName="from"
                  [attr.aria-label]="'Transition ' + (i + 1) + ' from'"
                  [attr.disabled]="submitting() ? '' : null"
                >
                  <option value="" disabled>From...</option>
                  @for (s of states.controls; track s) {
                    <option [value]="s.value.code">{{ s.value.name || s.value.code }}</option>
                  }
                </select>
                <span class="we-arrow">→</span>
                <select
                  class="we-select"
                  formControlName="to"
                  [attr.aria-label]="'Transition ' + (i + 1) + ' to'"
                  [attr.disabled]="submitting() ? '' : null"
                >
                  <option value="" disabled>To...</option>
                  @for (s of states.controls; track s) {
                    <option [value]="s.value.code">{{ s.value.name || s.value.code }}</option>
                  }
                </select>
                <button
                  type="button"
                  class="we-btn-icon"
                  (click)="removeTransition(i)"
                  [attr.aria-label]="'Remove transition ' + (i + 1)"
                >
                  ✕
                </button>
              </div>
              @if (t.errors?.['terminalFrom'] && t.get('from')?.touched) {
                <div class="we-field-error we-field-error--row">
                  Terminal states cannot have outgoing transitions
                </div>
              }
              @if (t.errors?.['duplicateTransition'] && t.touched) {
                <div class="we-field-error we-field-error--row">
                  Duplicate transition
                </div>
              }
            }
          </div>

          @if (transitions.length === 0) {
            <p class="we-empty-text">No transitions defined yet.</p>
          }

          <button
            type="button"
            class="we-btn we-btn--add"
            (click)="addTransition()"
            [disabled]="states.length < 2 || submitting()"
          >
            + Add Transition
          </button>
        </section>

        <!-- Footer actions -->
        <div class="we-form-footer">
          <button
            type="button"
            class="we-btn we-btn--cancel"
            (click)="onCancel()"
            [disabled]="submitting()"
          >
            Cancel
          </button>
          <button
            type="submit"
            class="we-btn we-btn--submit"
            [disabled]="form.invalid || submitting()"
          >
            @if (submitting()) {
              <span class="we-spinner we-spinner--small" aria-hidden="true"></span>
              <span>Creating…</span>
            } @else {
              <span>Create Workflow</span>
            }
          </button>
        </div>

        <!-- Submit error -->
        @if (submitError(); as err) {
          <div class="we-submit-error" role="alert">
            <span class="we-error-icon" aria-hidden="true">⚠</span>
            <span class="we-error-text">{{ err }}</span>
          </div>
        }
      </form>
    </div>
  `,
  styles: [`
    .we-workflow-create {
      font-family: var(--we-font-family, system-ui, -apple-system, sans-serif);
      padding: var(--we-spacing, 16px);
      max-width: 640px;
      margin: 0 auto;
    }

    .we-workflow-create__header {
      margin-bottom: 24px;
    }

    .we-workflow-create__title {
      font-size: 1.5rem;
      font-weight: 600;
      color: var(--we-text, #212121);
      margin: 0;
    }

    /* ── Form group ── */
    .we-form-group {
      margin-bottom: 20px;
    }

    .we-label {
      display: block;
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--we-text, #212121);
      margin-bottom: 6px;
    }

    .we-input {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid var(--we-border, #e0e0e0);
      border-radius: var(--we-border-radius, 8px);
      font-size: 0.9rem;
      font-family: inherit;
      background: var(--we-bg, #ffffff);
      color: var(--we-text, #212121);
      transition: border-color 0.15s;
      box-sizing: border-box;
    }

    .we-input:focus {
      outline: none;
      border-color: var(--we-primary, #1976d2);
      box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.12);
    }

    .we-input--error {
      border-color: var(--we-danger, #d32f2f);
    }

    .we-input--error:focus {
      box-shadow: 0 0 0 2px rgba(211, 47, 47, 0.12);
    }

    .we-input:disabled {
      background: var(--we-bg-secondary, #f5f5f5);
      cursor: not-allowed;
    }

    /* ── Select ── */
    .we-select {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid var(--we-border, #e0e0e0);
      border-radius: var(--we-border-radius, 8px);
      font-size: 0.9rem;
      font-family: inherit;
      background: var(--we-bg, #ffffff);
      color: var(--we-text, #212121);
      transition: border-color 0.15s;
      box-sizing: border-box;
      cursor: pointer;
    }

    .we-select:focus {
      outline: none;
      border-color: var(--we-primary, #1976d2);
      box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.12);
    }

    .we-select:disabled {
      background: var(--we-bg-secondary, #f5f5f5);
      cursor: not-allowed;
      opacity: 0.7;
    }

    /* ── Field error ── */
    .we-field-error {
      display: block;
      color: var(--we-danger, #d32f2f);
      font-size: 0.8rem;
      margin-top: 4px;
    }

    .we-field-error--row {
      margin: -8px 0 8px 0;
      padding-left: 4px;
    }

    /* ── Form section ── */
    .we-form-section {
      margin-bottom: 24px;
      padding: 16px;
      background: var(--we-bg, #ffffff);
      border: 1px solid var(--we-border, #e0e0e0);
      border-radius: var(--we-border-radius, 8px);
    }

    .we-form-section__header {
      margin-bottom: 12px;
    }

    .we-form-section__title {
      font-size: 1.05rem;
      font-weight: 600;
      color: var(--we-text, #212121);
      margin: 0;
    }

    /* ── Dynamic list ── */
    .we-dynamic-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .we-dynamic-list--headers {
      margin-bottom: 4px;
    }

    .we-dynamic-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .we-dynamic-row--header {
      padding: 0 4px;
    }

    .we-dynamic-header {
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--we-text-secondary, #757575);
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }

    .we-dynamic-header--terminal {
      width: 90px;
      text-align: center;
    }

    .we-dynamic-header--remove {
      width: 36px;
    }

    .we-dynamic-header--arrow {
      width: 24px;
      text-align: center;
    }

    .we-dynamic-row .we-input {
      flex: 1;
      min-width: 0;
    }

    .we-dynamic-row .we-select {
      flex: 1;
      min-width: 0;
    }

    /* Terminal checkbox column */
    .we-checkbox-label {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.85rem;
      color: var(--we-text, #212121);
      cursor: pointer;
      white-space: nowrap;
      width: 90px;
      flex-shrink: 0;
    }

    .we-checkbox-label input[type="checkbox"] {
      width: 16px;
      height: 16px;
      cursor: pointer;
      accent-color: var(--we-primary, #1976d2);
    }

    .we-checkbox-label input[type="checkbox"]:disabled {
      cursor: not-allowed;
    }

    /* Arrow between selects */
    .we-arrow {
      flex-shrink: 0;
      width: 24px;
      text-align: center;
      color: var(--we-primary, #1976d2);
      font-weight: 600;
      font-size: 1.1rem;
    }

    /* ── Icon button ── */
    .we-btn-icon {
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid transparent;
      border-radius: 50%;
      background: transparent;
      color: var(--we-text-secondary, #757575);
      font-size: 0.9rem;
      cursor: pointer;
      transition: background 0.15s, color 0.15s;
      flex-shrink: 0;
    }

    .we-btn-icon:hover {
      background: #fff3f3;
      color: var(--we-danger, #d32f2f);
      border-color: var(--we-danger, #d32f2f);
    }

    .we-btn-icon:focus-visible {
      outline: 2px solid var(--we-primary, #1976d2);
      outline-offset: 2px;
    }

    .we-btn-icon:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    /* ── Add button ── */
    .we-btn--add {
      margin-top: 8px;
      padding: 8px 16px;
      border: 1px dashed var(--we-primary, #1976d2);
      border-radius: var(--we-border-radius, 8px);
      background: transparent;
      color: var(--we-primary, #1976d2);
      font-size: 0.85rem;
      font-weight: 500;
      cursor: pointer;
      font-family: inherit;
      transition: background 0.15s;
    }

    .we-btn--add:hover:not(:disabled) {
      background: rgba(25, 118, 210, 0.06);
    }

    .we-btn--add:disabled {
      opacity: 0.4;
      cursor: not-allowed;
      border-color: var(--we-border, #e0e0e0);
      color: var(--we-text-secondary, #757575);
    }

    .we-btn--add:focus-visible {
      outline: 2px solid var(--we-primary, #1976d2);
      outline-offset: 2px;
    }

    /* ── Empty text ── */
    .we-empty-text {
      color: var(--we-text-secondary, #757575);
      font-size: 0.85rem;
      margin: 8px 0;
    }

    /* ── Footer ── */
    .we-form-footer {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 12px;
      margin-top: 24px;
    }

    .we-btn--cancel {
      padding: 10px 24px;
      border: 1px solid var(--we-border, #e0e0e0);
      border-radius: var(--we-border-radius, 8px);
      background: var(--we-bg, #ffffff);
      color: var(--we-text, #212121);
      font-size: 0.9rem;
      font-weight: 500;
      cursor: pointer;
      font-family: inherit;
      transition: background 0.15s, border-color 0.15s;
    }

    .we-btn--cancel:hover:not(:disabled) {
      background: var(--we-bg-secondary, #f5f5f5);
      border-color: var(--we-text-secondary, #757575);
    }

    .we-btn--cancel:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .we-btn--cancel:focus-visible {
      outline: 2px solid var(--we-primary, #1976d2);
      outline-offset: 2px;
    }

    .we-btn--submit {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 24px;
      border: none;
      border-radius: var(--we-border-radius, 8px);
      background: var(--we-primary, #1976d2);
      color: #ffffff;
      font-size: 0.95rem;
      font-weight: 600;
      cursor: pointer;
      font-family: inherit;
      transition: background 0.15s, opacity 0.15s;
    }

    .we-btn--submit:hover:not(:disabled) {
      background: var(--we-primary-hover, #1565c0);
    }

    .we-btn--submit:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .we-btn--submit:focus-visible {
      outline: 2px solid var(--we-primary, #1976d2);
      outline-offset: 2px;
    }

    /* ── Spinner ── */
    .we-spinner {
      display: inline-block;
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: #ffffff;
      border-radius: 50%;
      animation: we-spin 0.6s linear infinite;
    }

    .we-spinner--small {
      width: 14px;
      height: 14px;
      border-width: 2px;
    }

    @keyframes we-spin {
      to { transform: rotate(360deg); }
    }

    /* ── Submit error banner ── */
    .we-submit-error {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 16px;
      padding: 12px 16px;
      background: #fff3f3;
      border: 1px solid var(--we-danger, #d32f2f);
      border-radius: var(--we-border-radius, 8px);
      color: var(--we-danger, #d32f2f);
      font-size: 0.9rem;
    }

    .we-error-icon {
      font-size: 1.1rem;
      flex-shrink: 0;
    }

    .we-error-text {
      flex: 1;
    }
  `],
})
export class WorkflowCreateComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(WorkflowApiService);

  /** Emitted when the API responds successfully, with the new workflow UUID. */
  @Output() workflowCreated = new EventEmitter<string>();

  /** Emitted when the user clicks Cancel/Back. */
  @Output() cancel = new EventEmitter<void>();

  /** Emitted on API error, for host app integration (toast, etc.). */
  @Output() errorEvent = new EventEmitter<string>();

  /** Reactive state */
  readonly submitting = signal(false);
  readonly submitError = signal<string | null>(null);

  readonly form: FormGroup = this.fb.group({
    name: ['', [Validators.required, this.nonBlankValidator]],
    states: this.fb.array([], { validators: [Validators.minLength(2)] }),
    initialState: ['', Validators.required],
    transitions: this.fb.array([]),
  });

  get states(): FormArray {
    return this.form.get('states') as FormArray;
  }

  get transitions(): FormArray {
    return this.form.get('transitions') as FormArray;
  }

  /** Initialize with 2 default empty state rows */
  constructor() {
    this.addState();
    this.addState();
  }

  // ── Validation helpers ──

  private nonBlankValidator(control: { value: string }): { [key: string]: boolean } | null {
    if (control.value != null && control.value.trim().length === 0) {
      return { blank: true };
    }
    return null;
  }

  nameInvalid(): string | null {
    const name = this.form.get('name');
    if (!name || !name.touched || !name.invalid) return null;
    if (name.errors?.['required'] || name.errors?.['blank']) {
      return 'Workflow name is required';
    }
    return null;
  }

  initialStateInvalid(): string | null {
    const control = this.form.get('initialState');
    if (!control || !control.touched || !control.invalid) return null;
    if (control.errors?.['required']) {
      return 'Select an initial state';
    }
    return null;
  }

  // ── States management ──

  addState(): void {
    if (this.states.length >= 10) return;
    const group = this.fb.group({
      code: ['', [Validators.required, this.nonBlankValidator]],
      name: ['', [Validators.required, this.nonBlankValidator]],
      terminal: [false],
    });
    this.states.push(group);
    // Re-run cross-field validators after adding
    this.updateTransitionValidators();
    this.updateDuplicateCodeValidator();
  }

  removeState(index: number): void {
    const removedCode = this.states.at(index).value.code;

    // If removed state was the initial state, reset it
    if (this.form.get('initialState')?.value === removedCode) {
      this.form.get('initialState')?.setValue('');
    }

    // Remove any transitions that reference the removed state
    const toRemove: number[] = [];
    for (let i = 0; i < this.transitions.length; i++) {
      const t = this.transitions.at(i);
      if (t.value.from === removedCode || t.value.to === removedCode) {
        toRemove.push(i);
      }
    }
    for (let i = toRemove.length - 1; i >= 0; i--) {
      this.transitions.removeAt(toRemove[i]);
    }

    this.states.removeAt(index);
    this.updateTransitionValidators();
    this.updateDuplicateCodeValidator();
  }

  onStateNameInput(index: number): void {
    const stateGroup = this.states.at(index);
    const codeControl = stateGroup.get('code');
    const nameControl = stateGroup.get('name');

    // Only auto-fill if code is pristine (user hasn't manually edited it)
    if (codeControl?.pristine && nameControl?.value) {
      const snake = toSnakeCase(nameControl.value);
      if (snake) {
        codeControl.setValue(snake);
      }
    }
  }

  // ── Transitions management ──

  addTransition(): void {
    if (this.states.length < 2) return;
    const group = this.fb.group({
      from: ['', Validators.required],
      to: ['', Validators.required],
    });
    this.transitions.push(group);
    this.updateTransitionValidators();
  }

  removeTransition(index: number): void {
    this.transitions.removeAt(index);
    this.updateTransitionValidators();
  }

  // ── Cross-field validators ──

  private updateDuplicateCodeValidator(): void {
    for (let i = 0; i < this.states.length; i++) {
      const codeControl = this.states.at(i).get('code');
      const codeValue = codeControl?.value;
      if (!codeValue) {
        codeControl?.setErrors(codeControl.errors ? { ...codeControl.errors, duplicateCode: false } : null);
        this.removeDuplicateCodeError(i);
        continue;
      }

      let isDuplicate = false;
      for (let j = 0; j < this.states.length; j++) {
        if (i === j) continue;
        if (this.states.at(j).value.code === codeValue) {
          isDuplicate = true;
          break;
        }
      }

      if (isDuplicate) {
        codeControl?.setErrors({ ...(codeControl.errors || {}), duplicateCode: true });
      } else {
        this.removeDuplicateCodeError(i);
      }
    }
  }

  private removeDuplicateCodeError(index: number): void {
    const codeControl = this.states.at(index).get('code');
    if (!codeControl) return;
    const errors = { ...(codeControl.errors || {}) };
    delete errors['duplicateCode'];
    if (Object.keys(errors).length === 0) {
      codeControl.setErrors(null);
    } else {
      codeControl.setErrors(errors);
    }
  }

  private updateTransitionValidators(): void {
    const stateCodes = this.states.controls.map(s => s.value.code).filter(Boolean);

    for (let i = 0; i < this.transitions.length; i++) {
      const t = this.transitions.at(i);
      const from = t.value.from;
      const to = t.value.to;
      const errors: Record<string, boolean> = {};

      // Check if from state is terminal
      if (from && stateCodes.includes(from)) {
        const fromState = this.states.controls.find(s => s.value.code === from);
        if (fromState?.value.terminal) {
          errors['terminalFrom'] = true;
        }
      }

      // Check for duplicate transitions (same from+to pair)
      let isDuplicate = false;
      for (let j = 0; j < this.transitions.length; j++) {
        if (i === j) continue;
        if (this.transitions.at(j).value.from === from && this.transitions.at(j).value.to === to) {
          isDuplicate = true;
          break;
        }
      }
      if (isDuplicate && from && to) {
        errors['duplicateTransition'] = true;
      }

      t.setErrors(Object.keys(errors).length > 0 ? errors : null);
    }
  }

  // ── Submit ──

  onSubmit(): void {
    if (this.form.invalid) {
      // Mark all fields as touched to trigger validation display
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.submitError.set(null);

    const request: CreateWorkflowRequest = {
      name: this.form.value.name.trim(),
      states: this.states.value.map((s: StateFormValue) => ({
        code: s.code.trim(),
        name: s.name.trim(),
        terminal: s.terminal,
      })),
      transitions: this.transitions.value.map((t: TransitionFormValue) => ({
        from: t.from,
        to: t.to,
      })),
      initialState: this.form.value.initialState,
    };

    this.api.createWorkflow(request).subscribe({
      next: (response) => {
        this.submitting.set(false);
        this.workflowCreated.emit(response.workflowId);
      },
      error: (err) => {
        const message = err.error?.message || err.message || 'Failed to create workflow.';
        this.submitError.set(message);
        this.errorEvent.emit(message);
        this.submitting.set(false);
      },
    });
  }

  onCancel(): void {
    this.cancel.emit();
  }
}
