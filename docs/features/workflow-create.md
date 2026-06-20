# Feature: Create Workflow (Frontend Component)

Form-based UI to create a new `Workflow` definition via `POST /workflows`.

## Status

- **Iteration:** v0.3 (post-execution-list)
- **Backend:** ✅ Already implemented (`POST /workflows` exists)
- **Frontend:** ✅ Implemented
- **Dependencies:** None

---

## 1. Motivation

The current UI allows **viewing** workflows (list, detail) and **interacting with executions** (start, transition, history), but there is **no way to create a workflow** from the frontend. The only path today is:

1. Hit `POST /workflows` directly via curl, Postman, or the API
2. Refresh the workflow list page to see the new workflow
3. Navigate to its detail to start executions

This is a poor developer/demo experience. The MVP's own success criteria include "Crear workflows" as a deliverable (section 10 of `docs/mvp.md`).

This feature adds a **create workflow form** so users can:

- Define a workflow name
- Define states (code, name, terminal flag)
- Select an initial state
- Define valid transitions between states
- Submit the form to create the workflow via the API
- Navigate to the newly created workflow's detail page

---

## 2. Scope

### In Scope

| Layer | Deliverable |
|---|---|
| **Frontend model** | `CreateWorkflowRequest` interface — request body for `POST /workflows` |
| **Frontend service** | `WorkflowApiService.createWorkflow()` — new method |
| **Frontend component** | `WorkflowCreateComponent` — standalone, form with dynamic rows, loading/error/success states |
| **Frontend library export** | Export `WorkflowCreateComponent` from `public-api.ts` |
| **Frontend shell — page** | `WorkflowCreatePageComponent` — host app page wrapping the component |
| **Frontend shell — route** | `/workflows/new` — lazy-loaded route for the create page |
| **Frontend shell — list page** | Add "New Workflow" button + `createWorkflow` output to navigate to `/workflows/new` |
| **Frontend tests** | Unit tests for service + component (loading, validation, submit, error, cancel) |

### Out of Scope (explicitly NOT included)

- Inline creation inside the list component (no modal, no slide-out)
- Duplicate workflow detection (name uniqueness is backend-enforced, but not pre-checked in UI)
- Bulk creation
- Template/blueprint workflows (copy from existing)
- Drag-and-drop state/transition editors
- Visual graph preview
- Conditional transitions or guards
- Multi-step wizard — single-page form
- Backend changes — endpoint already exists and is stable

---

## 3. API Contract

### Backend (already implemented)

#### `POST /workflows`

**Request:**

```
POST /workflows
Content-Type: application/json
```

```json
{
  "name": "simple-approval",
  "states": [
    { "code": "created", "name": "CREATED", "terminal": false },
    { "code": "in_review", "name": "IN REVIEW", "terminal": false },
    { "code": "approved", "name": "APPROVED", "terminal": true },
    { "code": "rejected", "name": "REJECTED", "terminal": true }
  ],
  "transitions": [
    { "from": "created", "to": "in_review" },
    { "from": "in_review", "to": "approved" },
    { "from": "in_review", "to": "rejected" }
  ],
  "initialState": "created"
}
```

**Response `200 OK`:**

```json
{
  "workflowId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Validation errors `400 Bad Request`:**

| Condition | Error detail |
|---|---|
| `name` blank | `name: must not be blank` |
| `states` empty | `states: must not be empty` |
| State `code` blank | `states[].code: must not be blank` |
| `initialState` not in `states` | `initialState: must reference a valid state code` |
| Duplicate state code | `states: codes must be unique` |
| Transition references unknown state | `transitions[].from/to: must reference a valid state code` |
| Transition from a terminal state | `transitions[].from: terminal states cannot have outgoing transitions` |

---

## 4. Frontend Contract

### 4.1 Models

Add to `models/workflow.model.ts`:

```typescript
export interface CreateWorkflowRequest {
  name: string;
  states: StateDefinition[];
  transitions: TransitionDefinition[];
  initialState: string;
}
```

Reuses existing types:
- `StateDefinition` — `{ code: string; name: string; terminal: boolean }`
- `TransitionDefinition` — `{ from: string; to: string }`

No new response model needed — the existing pattern uses inline types (`Observable<{ workflowId: string }>`), consistent with `execution-api.service`'s `startExecution()` returning `Observable<{ executionId: string }>`.

### 4.2 Service

Add to `services/workflow-api.service.ts`:

```typescript
createWorkflow(request: CreateWorkflowRequest): Observable<{ workflowId: string }> {
  return this.http.post<{ workflowId: string }>(
    `${this.config.apiBaseUrl}/workflows`,
    request,
  );
}
```

### 4.3 Component: `WorkflowCreateComponent`

**Selector:** `we-workflow-create`

**Standalone:** Yes

**Imports:** `FormsModule` or `ReactiveFormsModule` (see Decision Log), `JsonPipe` (for debug, optionally), `NgClass` for validation styling

#### Inputs

None. The component is self-contained — it renders an empty form on mount.

| Name | Type | Required | Description |
|---|---|---|---|
| — | — | — | No inputs |

#### Outputs

| Name | Event type | Description |
|---|---|---|
| `workflowCreated` | `string` (workflow UUID) | Emitted when the API responds successfully |
| `cancel` | `void` | Emitted when user clicks Cancel/Back |
| `errorEvent` | `string` | Emitted on API error, for host app integration (toast, etc.) |

#### Reactive State

```typescript
readonly submitting = signal(false);
readonly submitError = signal<string | null>(null);
```

Form state itself is managed via a `FormGroup` with `FormArray`s for states and transitions.

#### Form Structure

```
WorkflowCreateComponent
├── Header: "Create Workflow" (h1/h2)
│
├── Name field
│   └── Input: text, required, placeholder "e.g. simple-approval"
│
├── States section
│   ├── Section title: "States" + "(n)" count
│   ├── Column headers: Code | Name | Terminal | (remove)
│   ├── Dynamic rows (FormArray):
│   │   └── Row: [code input] | [name input] | [terminal checkbox] | [✕ remove button]
│   ├── [+ Add State] button (disabled at 10 states or while submitting)
│   └── Validation hint: "At least 2 states required" (shown when < 2 states and dirty)
│
├── Initial State section
│   ├── Section title: "Initial State"
│   └── Select/radio: populated from state codes (disabled if < 2 states)
│
├── Transitions section
│   ├── Section title: "Transitions" + "(n)" count
│   ├── Column headers: From | To | (remove)
│   ├── Dynamic rows (FormArray):
│   │   └── Row: [from select ← state codes] | [to select ← state codes] | [✕ remove button]
│   ├── [+ Add Transition] button (disabled while < 2 states or while submitting)
│   └── Empty hint: "No transitions defined yet." (when 0 transitions)
│
├── Footer actions
│   ├── [Cancel] button → emits `cancel`
│   └── [Create Workflow] button (primary)
│       ├── Disabled while form invalid or submitting
│       ├── Shows spinner + "Creating…" while submitting
│       └── Shows "Create Workflow" at rest
│
└── Submit error banner
    └── ⚠ Error message (shown when submitError is set)
```

#### UI States

| State | Visual |
|---|---|
| **Initial (form empty)** | Empty form with default state rows (suggest 2) + validation hints visible. Submit button disabled. |
| **Filling** | Validation errors appear inline as user interacts. Submit button enables when form is valid. |
| **Submitting** | Submit button shows spinner + "Creating…", all inputs disabled. Cancel enabled. |
| **Submit error** | ⚠ inline error banner above footer. Form remains filled. User can edit and retry. |
| **Submit success** | Emits `workflowCreated` with the new workflow UUID. Parent handles navigation. |

#### Form Validation Rules

| Field | Rule | Error Message |
|---|---|---|
| `name` | Required, non-blank | "Workflow name is required" |
| `states` | Min 2 items | "At least 2 states are required" |
| `states[].code` | Required, non-blank | "State code is required" |
| `states[].code` | Unique across all states | "State codes must be unique" |
| `states[].code` | Pattern: lowercase+underscore | "Use lowercase letters and underscores (e.g. in_review)" (warning, not blocking) |
| `states[].name` | Required, non-blank | "State name is required" |
| `initialState` | Required | "Select an initial state" |
| `transitions[].from` | Required | "Select a source state" |
| `transitions[].to` | Required | "Select a target state" |
| `transitions[].from` | Must not be terminal | "Terminal states cannot have outgoing transitions" |
| `transitions[*]` | Duplicate (from+to pair) | "Duplicate transition" |
| `transitions` | No circular self-transition | Not enforced in MVP |

#### Interaction Details

- **Adding a state row**: Clicking [+ Add State] pushes a new FormGroup with defaults `{ code: '', name: '', terminal: false }`. The new row's code input receives focus automatically.
- **Removing a state row**: Clicking ✕ removes the row. If the removed state was the `initialState`, reset `initialState` to empty. If any transition referenced the removed state's code, that transition row is also removed.
- **Adding a transition row**: Clicking [+ Add Transition] pushes `{ from: '', to: '' }`. The new row's `from` dropdown receives focus.
- **Removing a transition row**: Clicking ✕ removes the row.
- **State code → dropdowns update**: The `from`/`to` selects in transition rows and the initial state select are derived from the current list of state codes. Adding or removing a state immediately updates all dropdown options.
- **Code auto-fill from name**: When user types a name, the code field is auto-filled with a snake_case version unless the user has already modified the code field. (Implement via a pristine/dirty flag on the code control.)
- **Keyboard navigation**: Tab flows through rows top-to-bottom. Enter in any field does NOT submit (prevents accidental submission).

#### Template Sketch

```
<div class="we-workflow-create">
  <!-- Header -->
  <div class="we-workflow-create__header">
    <h2 class="we-workflow-create__title">Create Workflow</h2>
  </div>

  <!-- Name -->
  <div class="we-form-group">
    <label class="we-label">Workflow Name</label>
    <input class="we-input" [class.we-input--error]="nameInvalid()" />
    @if (nameInvalid()) {
      <span class="we-field-error">{{ nameErrorMessage() }}</span>
    }
  </div>

  <!-- States -->
  <section class="we-form-section">
    <h3 class="we-form-section__title">States</h3>
    <div class="we-dynamic-list">
      @for (state of states.controls; track state; let i = $index) {
        <div class="we-dynamic-row">
          <input class="we-input" placeholder="Code" />
          <input class="we-input" placeholder="Name" />
          <label class="we-checkbox-label">
            <input type="checkbox" /> Terminal
          </label>
          <button class="we-btn-icon" (click)="removeState(i)">✕</button>
        </div>
      }
    </div>
    <button class="we-btn we-btn--add" (click)="addState()">+ Add State</button>
    @if (states.length < 2 && formDirty) {
      <span class="we-field-error">At least 2 states required.</span>
    }
  </section>

  <!-- Initial State -->
  <section class="we-form-section">
    <h3 class="we-form-section__title">Initial State</h3>
    <select class="we-select">
      <option value="" disabled>Select initial state...</option>
      @for (state of states.controls; track state) {
        <option [value]="state.value.code">{{ state.value.name }}</option>
      }
    </select>
  </section>

  <!-- Transitions -->
  <section class="we-form-section">
    <h3 class="we-form-section__title">Transitions</h3>
    <div class="we-dynamic-list">
      @for (t of transitions.controls; track t; let i = $index) {
        <div class="we-dynamic-row">
          <select class="we-select">...</select>
          <span class="we-arrow">→</span>
          <select class="we-select">...</select>
          <button class="we-btn-icon" (click)="removeTransition(i)">✕</button>
        </div>
      }
    </div>
    <button class="we-btn we-btn--add" (click)="addTransition()">+ Add Transition</button>
  </section>

  <!-- Footer -->
  <div class="we-form-footer">
    <button class="we-btn we-btn--cancel" (click)="onCancel()">Cancel</button>
    <button class="we-btn we-btn--submit" [disabled]="form.invalid || submitting()" (click)="onSubmit()">
      @if (submitting()) {
        <span class="we-spinner we-spinner--small"></span>
        <span>Creating…</span>
      } @else {
        <span>Create Workflow</span>
      }
    </button>
  </div>

  <!-- Submit error -->
  @if (submitError(); as err) {
    <div class="we-submit-error" role="alert">⚠ {{ err }}</div>
  }
</div>
```

### 4.4 CSS Design System

Uses the existing `--we-*` custom properties plus new form-specific classes:

| CSS Class | Purpose |
|---|---|
| `.we-workflow-create` | Root container, max-width 640px centered |
| `.we-workflow-create__header` | Top section with title |
| `.we-workflow-create__title` | "Create Workflow" heading |
| `.we-form-group` | Single field wrapper (label + input + error) |
| `.we-form-section` | Section wrapper (states, transitions, etc.) |
| `.we-form-section__title` | Section heading (h3) |
| `.we-label` | Field label |
| `.we-input` | Text input (shared style, reusable) |
| `.we-input--error` | Input with red border |
| `.we-select` | Select dropdown |
| `.we-checkbox-label` | Label containing checkbox |
| `.we-field-error` | Inline validation error text |
| `.we-dynamic-list` | Container for dynamic rows |
| `.we-dynamic-row` | Single row in a dynamic list (flex row) |
| `.we-btn-icon` | Small circular icon button (remove row) |
| `.we-btn--add` | Ghost text button for adding rows |
| `.we-btn--cancel` | Secondary/outline button |
| `.we-btn--submit` | Primary button for form submission |
| `.we-form-footer` | Bottom actions row |
| `.we-submit-error` | Error banner at form bottom |

No new `--we-*` custom properties needed. The form follows the established typography, spacing, and color scales.

### 4.5 Integration in Shell App

#### New route: `/workflows/new`

```typescript
// app.routes.ts
{
  path: 'workflows/new',
  loadComponent: () => import('./workflow-create-page.component').then(m => m.WorkflowCreatePageComponent),
  title: 'Create Workflow',
}
```

Note: The `/workflows/new` route must be defined **before** `/workflows/:id` in the route config to avoid the `:id` param matching the literal "new".

#### New page component: `WorkflowCreatePageComponent`

```typescript
@Component({
  selector: 'shell-workflow-create-page',
  standalone: true,
  imports: [WorkflowCreateComponent],
  template: `
    <we-workflow-create
      (workflowCreated)="onWorkflowCreated($event)"
      (cancel)="onCancel()"
    />
  `,
})
export class WorkflowCreatePageComponent {
  private readonly router = inject(Router);

  onWorkflowCreated(workflowId: string): void {
    this.router.navigate(['/workflows', workflowId]);
  }

  onCancel(): void {
    this.router.navigate(['/']);
  }
}
```

#### Update `WorkflowListPageComponent`

Add a "New Workflow" button that navigates to `/workflows/new`:

```html
<div class="shell-workflow-list-page">
  <div class="shell-workflow-list-page__toolbar">
    <we-workflow-list
      title="Workflows"
      (workflowSelected)="onWorkflowSelected($event)"
    />
    <a
      class="shell-btn shell-btn--primary"
      routerLink="/workflows/new"
    >
      + New Workflow
    </a>
  </div>
</div>
```

The "New Workflow" button lives in the **shell**, not the library, because routing is a shell concern per the architecture decision in CONTEXT.md.

### 4.6 Form UX Considerations (Edge Cases)

| Scenario | Behavior |
|---|---|
| User opens form | 2 default empty state rows, no transitions, initial state empty, name empty. Submit disabled. |
| User fills name + 2 states but no transitions | Valid — workflows with 0 transitions are allowed (though unusual). Submit is enabled. |
| User adds state, fills code, then removes it | If it was the initial state, reset initialState. If transitions reference it, remove those transitions. |
| User adds transition before adding states | `+ Add Transition` is disabled until ≥ 2 states exist. |
| User submits with network error | Error banner shown. Form stays filled. User can retry. |
| User submits with validation error from backend (400) | Error banner shows backend message. Form stays filled. |
| User clicks Cancel | Emits `cancel` event (no confirmation dialog in MVP). |
| User submits successfully | Emits `workflowCreated` with UUID. Parent navigates. |
| All states removed | `initialState` resets to empty. Transition section + add button disabled. |

---

## 5. Backend Verification

No backend changes required. However, for testing completeness:

| Layer | What to verify |
|---|---|
| **API** | `POST /workflows` accepts the same request format the frontend will send |
| **API** | `POST /workflows` returns `201 Created` (currently returns `200` — consider changing to `201`) |

**Note:** The backend currently returns `200 OK` when creating a workflow. Per REST best practices, `POST` should return `201 Created` with a `Location` header. This is a minor backend improvement opportunity but not blocking for the frontend feature.

---

## 6. Tests

### Frontend — Service

| Test | Description |
|---|---|
| `createWorkflow` calls `POST /workflows` with correct body | Uses `HttpClientTestingController` to verify request method, URL, and body |
| `createWorkflow` returns `{ workflowId }` | Verifies response mapping |

### Frontend — Component

| Test | Description |
|---|---|
| **Render** | Renders "Create Workflow" title, name input, states section, transitions section, initial state dropdown, cancel + submit buttons |
| **Default state** | Starts with 2 empty state rows, no transitions, submit button disabled |
| **Add state row** | Clicking "+ Add State" adds a new empty state row |
| **Remove state row** | Clicking ✕ removes the row; if it was the last row, "At least 2 states" hint appears |
| **Remove state updates transitions** | Removing a state referenced by a transition also removes that transition |
| **Remove state resets initialState** | Removing the current `initialState` resets the dropdown |
| **Add transition row** | Clicking "+ Add Transition" adds a new transition row with from/to dropdowns populated from state codes |
| **Remove transition row** | Clicking ✕ removes the transition row |
| **Add transition disabled** | "+ Add Transition" is disabled when < 2 states exist |
| **Initial state dropdown** | Populated from state codes; updates when states change |
| **Transition dropdowns** | Populated from state codes; updates when states change |
| **Name validation** | Shows error when name is empty and field is touched |
| **States validation** | Shows error when < 2 states |
| **Initial state validation** | Shows error when not selected |
| **Form validity** | Submit button enables only when all validations pass |
| **Submit call** | Clicking submit calls `createWorkflow` with correct request body |
| **Loading state** | Submit button shows spinner + "Creating…" and all inputs disabled during submission |
| **Submit error** | On API error, shows error banner, form remains filled, inputs re-enabled |
| **Submit success** | On success, emits `workflowCreated` with the new UUID |
| **Cancel** | Clicking Cancel emits `cancel` event |
| **Code auto-fill** | Typing a name auto-fills the code field with snake_case (if code is pristine) |
| **Terminal → transition guard** | Creating a transition from a terminal state shows validation error |

---

## 7. Improvements & Refactoring Opportunities

These are **catalogued** for future iterations, not scoped into this feature:

| # | Improvement | Rationale |
|---|---|---|
| 1 | **Backend → 201 Created** | `POST /workflows` returns `200` instead of `201`. Change to `201` with `Location` header for REST compliance. |
| 2 | **Shared CSS for skeleton/shimmer** | The shimmer `@keyframes` and skeleton classes (`we-skeleton-line`, etc.) are duplicated across all 5 components. Extract to a shared stylesheet or use an Angular mixin. |
| 3 | **Shared button styles** | `.we-btn--back` is defined in both `WorkflowDetailComponent` and `ExecutionDetailComponent` with near-identical CSS. Extract to a global `.we-btn` set. |
| 4 | **Consistent retry policy** | `WorkflowListComponent` and `WorkflowDetailComponent` show a retry button on error, while `ExecutionListComponent` and `ExecutionHistoryComponent` do not. Document a consistent policy (e.g., always retry=true for root-level components, false for embedded children). |
| 5 | **Parsing backend validation errors** | Currently, all error handlers use a generic string. Consider parsing `HttpErrorResponse` for field-level validation errors to show inline hints next to specific fields. |
| 6 | **Form state persistence** | Warn user before navigating away with unsaved changes (`canDeactivate` guard). Not needed for MVP. |
| 7 | **Duplicate workflow name** | The backend returns 400 if a workflow with the same name exists. The frontend could pre-check with `GET /workflows` before submitting. Low priority. |
| 8 | **Code auto-fill UX** | The snake_case auto-fill from name is useful but could surprise users. Consider showing a visual hint ("Auto-filled from name") or a toggle. |

---

## 8. Open Questions / Decisions Log

| Question | Decision | Rationale |
|---|---|---|
| **Reactive vs Template-driven forms?** | **Reactive Forms** (`FormGroup`, `FormArray`) | Dynamic row management (add/remove states, transitions) and cross-field validation (state code uniqueness, terminal guard) are much cleaner with Reactive Forms. |
| **Component in library or shell?** | **Library** (`WorkflowCreateComponent`) | Follows the established pattern: all reusable UI lives in the library, shell handles routing only. The component emits `workflowCreated`/`cancel` and the shell navigates. |
| **Default rows on mount?** | **2 empty state rows** | Reduces friction — user immediately sees the expected structure. Adding the first row is an extra click with no benefit. 2 rows also makes the column layout visible. |
| **Code auto-fill from name?** | **Yes, with pristine guard** | Common UX pattern (similar to slug generation). Only auto-fills if user hasn't manually edited the code field. |
| **Transitions required?** | **No** | Backend allows empty transitions list. A workflow with states but no transitions is unusual but valid (e.g., a "read-only" workflow). |
| **Naming: `WorkflowCreateComponent` vs `CreateWorkflowComponent`?** | **`WorkflowCreateComponent`** | Matches existing convention: `WorkflowListComponent`, `WorkflowDetailComponent`, `ExecutionListComponent`. |
| **Max states limit?** | **10 (soft limit)** | Prevents form performance issues with hundreds of rows. Not backend-enforced. |
| **How to handle backend 400 validation errors?** | **Show generic error banner** | Parsing field-level errors is a future improvement. For MVP, show the backend error message in the submit error banner. |

---

## 9. Changelog

| Date | Change |
|---|---|
| 2026-06-19 | Initial spec |

---

## Appendix: Implementation Order

Recommended implementation sequence to minimize context switching:

1. **Model**: Add `CreateWorkflowRequest` to `workflow.model.ts`
2. **Service**: Add `createWorkflow()` to `WorkflowApiService`
3. **Service test**: Write unit test for `createWorkflow()`
4. **Component**: Create `WorkflowCreateComponent` with template + styles
5. **Component test**: Write unit tests for the component
6. **Library export**: Add `WorkflowCreateComponent` to `public-api.ts`
7. **Shell page**: Create `WorkflowCreatePageComponent`
8. **Shell route**: Add `/workflows/new` to route config (before `:id`)
9. **Shell list update**: Add "New Workflow" button to `WorkflowListPageComponent`
10. **Verify**: Run `ng test` + `ng build` + manual smoke test in shell app
