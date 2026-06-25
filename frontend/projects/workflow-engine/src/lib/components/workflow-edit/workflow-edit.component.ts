import { Component, input, Output, EventEmitter, signal, inject, effect, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { WorkflowApiPort, WORKFLOW_API_PORT } from '../../services/workflow-api.port';
import { WorkflowDetail, UpdateWorkflowRequest, WorkflowEditability } from '../../models';
import { ErrorBannerComponent, SpinnerComponent } from '../ui';

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
  selector: 'we-workflow-edit',
  standalone: true,
  imports: [ReactiveFormsModule, ErrorBannerComponent, SpinnerComponent],
  styleUrl: '../../styles/shared.css',
  template: `
    <div class="we-workflow-edit">
      <!-- Loading state: skeleton -->
      @if (loading()) {
        <div class="we-workflow-edit__skeleton" aria-label="Loading workflow data">
          <div class="we-skeleton-block we-skeleton-block--title"></div>
          <div class="we-skeleton-block we-skeleton-block--line"></div>
          <div class="we-skeleton-block we-skeleton-block--line"></div>
          <div class="we-skeleton-block we-skeleton-block--line"></div>
        </div>
      }

      <!-- Load error state -->
      @if (loadError(); as err) {
        <div class="we-workflow-edit__load-error">
          <we-error-banner [message]="err" />
          <button type="button" class="we-btn we-btn--retry" (click)="loadData()">
            Retry
          </button>
        </div>
      }

      <!-- Form (only when data is loaded) -->
      @if (!loading() && !loadError()) {
        <div class="we-workflow-edit__header">
          <h2 class="we-workflow-edit__title">Edit Workflow</h2>
        </div>

        <form [formGroup]="form" (ngSubmit)="onSubmit()" novalidate>

          <!-- Restriction banner -->
          @if (editability(); as ed) {
            @if (ed.hasExecutions) {
              <div class="we-restriction-banner">
                <span>⚠</span>
                <span>
                  This workflow has {{ ed.executionCount }} execution(s).
                  Some changes are restricted. See locked states below.
                </span>
              </div>
            }
          }

          <!-- Name field -->
          <div class="we-form-group">
            <label class="we-label" for="wf-name">Workflow Name</label>
            <input
              id="wf-name"
              class="we-input"
              [class.we-input--error]="nameInvalid()"
              formControlName="name"
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
                  <span class="we-dynamic-header">Name</span>
                  <span class="we-dynamic-header">Code</span>
                  <span class="we-dynamic-header we-dynamic-header--terminal">Terminal</span>
                  <span class="we-dynamic-header we-dynamic-header--remove"></span>
                </div>
              </div>
            }

            <div class="we-dynamic-list" formArrayName="states">
              @for (state of states.controls; track state; let i = $index) {
                <div
                  class="we-dynamic-row"
                  [class.we-dynamic-row--locked]="isLockedState(state.value.code)"
                  [formGroupName]="i"
                >
                  <input
                    class="we-input"
                    [class.we-input--error]="state.get('name')?.invalid && state.get('name')?.touched"
                    formControlName="name"
                    placeholder="e.g. IN REVIEW"
                    autocomplete="off"
                    [attr.aria-label]="'State ' + (i + 1) + ' name'"
                    [attr.disabled]="submitting() ? '' : null"
                  />
                  <input
                    class="we-input"
                    [class.we-input--readonly]="isExistingState(state.value.code)"
                    formControlName="code"
                    placeholder="e.g. in_review"
                    autocomplete="off"
                    [attr.aria-label]="'State ' + (i + 1) + ' code'"
                    [attr.readonly]="isExistingState(state.value.code) ? true : null"
                    [title]="isExistingState(state.value.code) ? 'State code cannot be changed after creation' : ''"
                    [attr.disabled]="submitting() ? '' : null"
                    (input)="onCodeInput(i)"
                  />
                  <label class="we-checkbox-label">
                    <input
                      type="checkbox"
                      formControlName="terminal"
                      [attr.aria-label]="'State ' + (i + 1) + ' terminal'"
                      [attr.disabled]="submitting() ? '' : null"
                    />
                    Terminal
                    @if (isLockedState(state.value.code)) {
                      <span class="we-lock-icon" [title]="lockedReason()">🔒</span>
                    }
                  </label>
                  @if (isLockedState(state.value.code)) {
                    <span class="we-lock-icon" [title]="lockedReason()">🔒</span>
                  } @else {
                    <button
                      type="button"
                      class="we-btn-icon"
                      [class.we-btn-icon--disabled]="submitting()"
                      (click)="removeState(i)"
                      [attr.aria-label]="'Remove state ' + (i + 1)"
                    >
                      ✕
                    </button>
                  }
                </div>
                @if (state.get('code')?.errors?.['duplicateCode'] && state.get('code')?.touched) {
                  <div class="we-field-error we-field-error--row">
                    State codes must be unique
                  </div>
                }
                @if (state.get('name')?.errors?.['duplicateName'] && state.get('name')?.touched) {
                  <div class="we-field-error we-field-error--row">
                    State names must be unique
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
                    @for (s of fromStateOptions(); track s) {
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
                    @for (s of toStateOptions(); track s) {
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

            <div class="we-transition-actions">
              <button
                type="button"
                class="we-btn we-btn--add"
                (click)="addTransition()"
                [disabled]="states.length < 2 || submitting()"
              >
                + Add Transition
              </button>
            </div>
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
                <we-spinner size="small" />
                <span>Saving…</span>
              } @else {
                <span>Save Changes</span>
              }
            </button>
          </div>

          <!-- Submit error -->
          @if (submitError(); as err) {
            <we-error-banner [message]="err" />
          }
        </form>
      }
    </div>
  `,
  styles: [`
    .we-workflow-edit {
      font-family: var(--we-font-family, system-ui, -apple-system, sans-serif);
      padding: var(--we-spacing, 16px);
      max-width: 640px;
      margin: 0 auto;
    }

    .we-workflow-edit__skeleton {
      display: flex;
      flex-direction: column;
      gap: var(--we-spacing, 16px);
    }

    .we-skeleton-block {
      background: var(--we-bg-secondary, #f5f5f5);
      border-radius: var(--we-border-radius, 8px);
      animation: we-shimmer 1.5s infinite;
    }

    .we-skeleton-block--title {
      height: 28px;
      width: 200px;
    }

    .we-skeleton-block--line {
      height: 48px;
    }

    @keyframes we-shimmer {
      0% { opacity: 0.6; }
      50% { opacity: 1; }
      100% { opacity: 0.6; }
    }

    .we-workflow-edit__load-error {
      text-align: center;
      padding: var(--we-spacing-xl, 32px);
    }

    .we-workflow-edit__load-error we-error-banner {
      display: block;
      margin-bottom: var(--we-spacing, 16px);
    }

    .we-workflow-edit__header {
      margin-bottom: var(--we-spacing-lg, 24px);
    }

    .we-workflow-edit__title {
      font-size: var(--we-font-size-2xl, 1.5rem);
      font-weight: 600;
      color: var(--we-text, #212121);
      margin: 0;
    }

    .we-btn--retry {
      padding: 10px var(--we-spacing-lg, 24px);
      border: 1px solid var(--we-primary, #1976d2);
      border-radius: var(--we-border-radius, 8px);
      background: var(--we-bg, #ffffff);
      color: var(--we-primary, #1976d2);
      font-size: var(--we-font-size-base, 0.9rem);
      font-weight: 500;
      cursor: pointer;
      font-family: inherit;
      transition: background 0.15s;
    }

    .we-btn--retry:hover {
      background: var(--we-primary-alpha-low, rgba(25, 118, 210, 0.08));
    }

    .we-btn--retry:focus-visible {
      outline: 2px solid var(--we-primary, #1976d2);
      outline-offset: 2px;
    }

    /* ── Form group ── */
    .we-form-group {
      margin-bottom: 20px;
    }

    .we-label {
      display: block;
      font-size: var(--we-font-size-base, 0.9rem);
      font-weight: 600;
      color: var(--we-text, #212121);
      margin-bottom: 6px;
    }

    .we-input {
      width: 100%;
      padding: 10px var(--we-spacing-md, 12px);
      border: 1px solid var(--we-border, #e0e0e0);
      border-radius: var(--we-border-radius, 8px);
      font-size: var(--we-font-size-base, 0.9rem);
      font-family: inherit;
      background: var(--we-bg, #ffffff);
      color: var(--we-text, #212121);
      transition: border-color var(--we-transition, 0.15s);
      box-sizing: border-box;
    }

    .we-input:focus {
      outline: none;
      border-color: var(--we-primary, #1976d2);
      box-shadow: 0 0 0 2px var(--we-primary-alpha-mid, rgba(25, 118, 210, 0.12));
    }

    .we-input--error {
      border-color: var(--we-danger, #d32f2f);
    }

    .we-input--error:focus {
      box-shadow: 0 0 0 2px var(--we-danger-alpha, rgba(211, 47, 47, 0.12));
    }

    .we-input--readonly {
      background: var(--we-bg-secondary, #f5f5f5);
      color: var(--we-text-secondary, #757575);
      cursor: not-allowed;
      user-select: none;
    }

    .we-input:disabled {
      background: var(--we-bg-secondary, #f5f5f5);
      cursor: not-allowed;
    }

    /* ── Select ── */
    .we-select {
      width: 100%;
      padding: 10px var(--we-spacing-md, 12px);
      border: 1px solid var(--we-border, #e0e0e0);
      border-radius: var(--we-border-radius, 8px);
      font-size: var(--we-font-size-base, 0.9rem);
      font-family: inherit;
      background: var(--we-bg, #ffffff);
      color: var(--we-text, #212121);
      transition: border-color var(--we-transition, 0.15s);
      box-sizing: border-box;
      cursor: pointer;
    }

    .we-select:focus {
      outline: none;
      border-color: var(--we-primary, #1976d2);
      box-shadow: 0 0 0 2px var(--we-primary-alpha-mid, rgba(25, 118, 210, 0.12));
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
      font-size: var(--we-font-size-sm, 0.85rem);
      margin-top: var(--we-spacing-xs, 4px);
    }

    .we-field-error--row {
      margin: -8px 0 8px 0;
      padding-left: var(--we-spacing-xs, 4px);
    }

    /* ── Form section ── */
    .we-form-section {
      margin-bottom: var(--we-spacing-lg, 24px);
      padding: var(--we-spacing, 16px);
      background: var(--we-bg, #ffffff);
      border: 1px solid var(--we-border, #e0e0e0);
      border-radius: var(--we-border-radius, 8px);
    }

    .we-form-section__header {
      margin-bottom: var(--we-spacing-md, 12px);
    }

    .we-form-section__title {
      font-size: var(--we-font-size-lg, 1.1rem);
      font-weight: 600;
      color: var(--we-text, #212121);
      margin: 0;
    }

    /* ── Dynamic list ── */
    .we-dynamic-list {
      display: flex;
      flex-direction: column;
      gap: var(--we-spacing-sm, 8px);
    }

    .we-dynamic-list--headers {
      margin-bottom: var(--we-spacing-xs, 4px);
    }

    .we-dynamic-row {
      display: flex;
      align-items: center;
      gap: var(--we-spacing-sm, 8px);
    }

    .we-dynamic-row--locked {
      opacity: 0.85;
    }

    .we-dynamic-header {
      font-size: var(--we-font-size-sm, 0.85rem);
      font-weight: 600;
      color: var(--we-text-secondary, #757575);
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }

    .we-dynamic-header:not(.we-dynamic-header--terminal):not(.we-dynamic-header--arrow):not(.we-dynamic-header--remove) {
      flex: 1;
      min-width: 0;
    }

    .we-dynamic-header--terminal {
      width: 90px;
      text-align: center;
      flex: none;
    }

    .we-dynamic-header--remove {
      width: 36px;
      flex: none;
    }

    .we-dynamic-header--arrow {
      width: 24px;
      text-align: center;
      flex: none;
    }

    .we-dynamic-row .we-input {
      flex: 1;
      min-width: 0;
    }

    .we-dynamic-row .we-select {
      flex: 1;
      min-width: 0;
    }

    .we-checkbox-label {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: var(--we-font-size-sm, 0.85rem);
      color: var(--we-text, #212121);
      cursor: pointer;
      white-space: nowrap;
      width: 120px;
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

    .we-arrow {
      flex-shrink: 0;
      width: 24px;
      text-align: center;
      color: var(--we-primary, #1976d2);
      font-weight: 600;
      font-size: var(--we-font-size-lg, 1.1rem);
    }

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
      font-size: var(--we-font-size-base, 0.9rem);
      cursor: pointer;
      transition: background var(--we-transition, 0.15s), color var(--we-transition, 0.15s);
      flex-shrink: 0;
    }

    .we-btn-icon:hover:not(.we-btn-icon--disabled) {
      background: var(--we-danger-bg, #fff3f3);
      color: var(--we-danger, #d32f2f);
      border-color: var(--we-danger, #d32f2f);
    }

    .we-btn-icon:focus-visible {
      outline: 2px solid var(--we-primary, #1976d2);
      outline-offset: 2px;
    }

    .we-btn-icon--disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    /* ── Lock icon ── */
    .we-lock-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      color: var(--we-text-secondary, #757575);
      font-size: 0.9rem;
      flex-shrink: 0;
      cursor: help;
    }

    /* ── Restriction banner ── */
    .we-restriction-banner {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 16px;
      margin-bottom: 16px;
      background: #fff8e1;
      border: 1px solid #f9a825;
      border-radius: var(--we-border-radius, 8px);
      color: #f57f17;
      font-size: 0.9rem;
    }

    /* ── Add button ── */
    .we-btn--add {
      margin-top: var(--we-spacing-sm, 8px);
      padding: var(--we-spacing-sm, 8px) var(--we-spacing, 16px);
      border: 1px dashed var(--we-primary, #1976d2);
      border-radius: var(--we-border-radius, 8px);
      background: transparent;
      color: var(--we-primary, #1976d2);
      font-size: var(--we-font-size-sm, 0.85rem);
      font-weight: 500;
      cursor: pointer;
      font-family: inherit;
      transition: background var(--we-transition, 0.15s);
    }

    .we-btn--add:hover:not(:disabled) {
      background: var(--we-primary-alpha-low, rgba(25, 118, 210, 0.08));
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

    .we-transition-actions {
      margin-top: var(--we-spacing-sm, 8px);
    }

    /* ── Footer ── */
    .we-form-footer {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: var(--we-spacing-md, 12px);
      margin-top: var(--we-spacing-lg, 24px);
    }

    .we-btn--cancel {
      padding: 10px var(--we-spacing-lg, 24px);
      border: 1px solid var(--we-border, #e0e0e0);
      border-radius: var(--we-border-radius, 8px);
      background: var(--we-bg, #ffffff);
      color: var(--we-text, #212121);
      font-size: var(--we-font-size-base, 0.9rem);
      font-weight: 500;
      cursor: pointer;
      font-family: inherit;
      transition: background var(--we-transition, 0.15s), border-color var(--we-transition, 0.15s);
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
      gap: var(--we-spacing-sm, 8px);
      padding: 10px var(--we-spacing-lg, 24px);
      border: none;
      border-radius: var(--we-border-radius, 8px);
      background: var(--we-primary, #1976d2);
      color: #ffffff;
      font-size: var(--we-font-size-md, 0.95rem);
      font-weight: 600;
      cursor: pointer;
      font-family: inherit;
      transition: background var(--we-transition, 0.15s), opacity var(--we-transition, 0.15s);
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
  `],
})
export class WorkflowEditComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(WORKFLOW_API_PORT);
  private readonly destroyRef = inject(DestroyRef);

  /** Required workflow UUID to edit. */
  readonly workflowId = input.required<string>();

  /** Emitted on successful update, with the workflow UUID. */
  @Output() workflowUpdated = new EventEmitter<string>();

  /** Emitted when the user clicks Cancel/Back. */
  @Output() cancel = new EventEmitter<void>();

  /** Emitted on API error, for host app integration (toast, etc.). */
  @Output() errorEvent = new EventEmitter<string>();

  /** ── Reactive state ── */
  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);
  readonly editability = signal<WorkflowEditability | null>(null);
  readonly submitting = signal(false);
  readonly submitError = signal<string | null>(null);

  /**
   * State codes that existed on the server (loaded by populateForm).
   * Newly added states are NOT in this set → their code field is editable.
   */
  private existingStateCodes = new Set<string>();

  /**
   * Indices of newly-added states whose code was manually edited by the user.
   * Once manually edited, auto-complete from name stops.
   */
  private codeManuallyEdited = new Set<number>();

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

  constructor() {
    // Load data when workflowId input changes
    effect(() => {
      const id = this.workflowId();
      if (id) {
        this.loadData();
      }
    });
  }

  private nonBlankValidator(control: { value: string }): { [key: string]: boolean } | null {
    if (control.value != null && control.value.trim().length === 0) {
      return { blank: true };
    }
    return null;
  }

  // ── Data loading ──

  protected loadData(): void {
    const id = this.workflowId();
    if (!id) return;

    this.loading.set(true);
    this.loadError.set(null);

    forkJoin({
      workflow: this.api.getWorkflow(id).pipe(
        catchError(err => {
          const msg = err?.error?.detail ?? err?.message ?? 'Failed to load workflow.';
          return of({ error: msg } as any);
        }),
      ),
      editability: this.api.getWorkflowEditability(id).pipe(
        catchError(err => {
          const msg = err?.error?.detail ?? err?.message ?? 'Failed to load editability.';
          return of({ error: msg } as any);
        }),
      ),
    }).subscribe({
      next: (result) => {
        const workflow = result.workflow as any;
        const editability = result.editability as any;

        if (workflow.error) {
          this.loadError.set(workflow.error);
          this.loading.set(false);
          return;
        }
        if (editability.error) {
          this.loadError.set(editability.error);
          this.loading.set(false);
          return;
        }

        this.editability.set(editability as WorkflowEditability);
        this.populateForm(workflow as WorkflowDetail);
        this.loading.set(false);
      },
      error: (err) => {
        this.loadError.set(err?.message ?? 'Failed to load workflow data.');
        this.loading.set(false);
      },
    });
  }

  private populateForm(workflow: WorkflowDetail): void {
    // Clear existing form arrays and tracking sets
    while (this.states.length > 0) this.states.removeAt(0);
    while (this.transitions.length > 0) this.transitions.removeAt(0);
    this.existingStateCodes.clear();
    this.codeManuallyEdited.clear();

    // Set name
    this.form.patchValue({ name: workflow.name });

    // Populate states – remember codes so we know which are existing (readonly)
    for (const state of workflow.states) {
      this.existingStateCodes.add(state.code);
      this.states.push(this.fb.group({
        code: [state.code, [Validators.required, this.nonBlankValidator]],
        name: [state.name, [Validators.required, this.nonBlankValidator]],
        terminal: [state.terminal],
      }));
    }

    // Set initial state
    this.form.patchValue({ initialState: workflow.initialState });

    // Populate transitions
    for (const t of workflow.transitions) {
      this.transitions.push(this.fb.group({
        from: [t.from, Validators.required],
        to: [t.to, Validators.required],
      }));
    }

    // Disable terminal checkbox for locked states
    for (let i = 0; i < this.states.length; i++) {
      const stateGroup = this.states.at(i);
      const code = stateGroup.get('code')?.value;
      if (code && this.isLockedState(code)) {
        stateGroup.get('terminal')?.disable({ onlySelf: true, emitEvent: false });
      }
    }

    // Run cross-field validators
    this.updateTransitionValidators();
    this.updateDuplicateCodeValidator();
    this.updateDuplicateNameValidator();
  }

  // ── State identity helpers ──

  /**
   * Whether the given state code belongs to a state that already existed
   * on the server. Existing-state codes are readonly to preserve execution
   * references. Newly added states have editable codes.
   */
  protected isExistingState(code: string): boolean {
    return this.existingStateCodes.has(code);
  }

  // ── Locked state helpers ──

  protected isLockedState(code: string): boolean {
    const ed = this.editability();
    return ed ? ed.restrictions.lockedStates.includes(code) : false;
  }

  protected lockedReason(): string {
    return this.editability()?.restrictions.lockedReason ?? 'Referenced by execution(s)';
  }

  // ── Validation helpers ──

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

  fromStateOptions(): AbstractControl[] {
    return this.states.controls.filter(s => s.value.code && !s.value.terminal);
  }

  toStateOptions(): AbstractControl[] {
    return this.states.controls.filter(s => s.value.code);
  }

  addState(): void {
    if (this.states.length >= 10) return;
    const index = this.states.length; // index of the new state
    const group = this.fb.group({
      code: ['', [Validators.required, this.nonBlankValidator]],
      name: ['', [Validators.required, this.nonBlankValidator]],
      terminal: [false],
    });
    this.states.push(group);

    // Auto-complete code from name for new states (unless code was manually edited)
    const nameControl = group.get('name');
    const codeControl = group.get('code');
    if (nameControl && codeControl) {
      nameControl.valueChanges.pipe(
        takeUntilDestroyed(this.destroyRef),
      ).subscribe((name: string | null) => {
        if (!this.codeManuallyEdited.has(index) && name) {
          codeControl.setValue(toSnakeCase(name), { emitEvent: false });
          // Re-run duplicate validators after auto-complete
          this.updateDuplicateCodeValidator();
        }
      });
    }

    this.updateTransitionValidators();
    this.updateDuplicateCodeValidator();
    this.updateDuplicateNameValidator();
  }

  /**
   * Called when the user types in a state code input.
   * Marks the code as manually edited so auto-complete from name stops.
   */
  protected onCodeInput(index: number): void {
    this.codeManuallyEdited.add(index);
  }

  removeState(index: number): void {
    const removedCode = this.states.at(index).value.code;
    if (this.isLockedState(removedCode)) return; // should not happen, but safety check

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

    // If removed state was the initial state, reset it
    if (this.form.get('initialState')?.value === removedCode) {
      this.form.get('initialState')?.setValue('');
    }

    this.states.removeAt(index);
    this.updateTransitionValidators();
    this.updateDuplicateCodeValidator();
    this.updateDuplicateNameValidator();
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

  private updateDuplicateNameValidator(): void {
    for (let i = 0; i < this.states.length; i++) {
      const nameControl = this.states.at(i).get('name');
      const nameValue = nameControl?.value;
      if (!nameValue) {
        this.removeDuplicateNameError(i);
        continue;
      }

      let isDuplicate = false;
      for (let j = 0; j < this.states.length; j++) {
        if (i === j) continue;
        if (this.states.at(j).value.name === nameValue) {
          isDuplicate = true;
          break;
        }
      }

      if (isDuplicate) {
        nameControl?.setErrors({ ...(nameControl.errors || {}), duplicateName: true });
      } else {
        this.removeDuplicateNameError(i);
      }
    }
  }

  private removeDuplicateNameError(index: number): void {
    const nameControl = this.states.at(index).get('name');
    if (!nameControl) return;
    const errors = { ...(nameControl.errors || {}) };
    delete errors['duplicateName'];
    if (Object.keys(errors).length === 0) {
      nameControl.setErrors(null);
    } else {
      nameControl.setErrors(errors);
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

      // Check for duplicate transitions
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

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.submitError.set(null);

    const raw = this.form.getRawValue();
    const request: UpdateWorkflowRequest = {
      name: raw.name.trim(),
      states: this.states.getRawValue().map((s: StateFormValue) => ({
        code: s.code.trim(),
        name: s.name.trim(),
        terminal: s.terminal,
      })),
      transitions: this.transitions.getRawValue().map((t: TransitionFormValue) => ({
        from: t.from,
        to: t.to,
      })),
      initialState: raw.initialState,
    };

    const id = this.workflowId();

    this.api.updateWorkflow(id, request).subscribe({
      next: () => {
        this.submitting.set(false);
        this.workflowUpdated.emit(id);
      },
      error: (err) => {
        let message = 'Failed to save changes.';
        if (err.error) {
          if (typeof err.error === 'string') {
            message = err.error;
          } else {
            // Try to get violations from ProblemDetail
            const violations = err.error.violations;
            if (violations && Array.isArray(violations) && violations.length > 0) {
              message = violations.join('\n');
            } else {
              message = err.error.detail || err.error.message || err.message || message;
            }
          }
        } else if (err.message) {
          message = err.message;
        }
        this.submitError.set(message);
        this.submitting.set(false);
        this.errorEvent.emit(message);
      },
    });
  }

  protected onCancel(): void {
    this.cancel.emit();
  }
}
