# Feature: Edit Workflow Definition

Form-based UI to modify an existing `Workflow` definition via `PUT /workflows/{workflowId}`.

## Status

- **Iteration:** Future (post-v0.4)
- **Backend:** ❌ Not implemented
- **Frontend:** ❌ Not implemented
- **Dependencies:** `frontend-polish.md` (skeleton, error toast, search)

---

## 1. Motivation

The current UI supports the full **create → view → execute** lifecycle, but there is **no way to modify a workflow after creation**. The only path today is:

1. Delete the workflow via API (if no executions exist)
2. Recreate it from scratch with the desired changes
3. Navigate back to the new workflow's detail

For workflows in active development, this is a poor experience. Users want to:

- Rename a workflow
- Add, remove, or rename states
- Change which state is the initial state
- Add, remove, or modify transitions
- Update the workflow name/description

This feature adds the ability to **edit an existing workflow definition**, with appropriate guardrails for workflows that have active or historical executions.

---

## 2. Domain Constraints & Design Decisions

### 2.1 Immutable Domain Model

`Workflow` is an **immutable aggregate** — all fields are `final` and set via constructor:

```java
public class Workflow {
    private final WorkflowId id;
    private final String name;
    private final List<State> states;
    private final List<Transition> transitions;
    private final State initialState;
}
```

Editing means constructing a **new** `Workflow` instance with the same ID but updated fields, then calling `workflowRepository.save()`. The `save()` method in `WorkflowRepository` already supports both INSERT and UPDATE.

### 2.2 State Identity Strategy

<table>
<tr>
<th>Aspect</th>
<th>Detail</th>
</tr>
<tr>
<td><strong>State.code</strong></td>
<td>Stable string identifier (e.g. <code>"in_review"</code>). <b>Unique across the entire system</b> (<code>@Column(unique = true)</code>). Used as the reference key by executions via <code>current_state_code</code>.</td>
</tr>
<tr>
<td><strong>State.name</strong></td>
<td>Mutable display label (e.g. <code>"IN REVIEW"</code>). Can be changed freely.</td>
</tr>
<tr>
<td><strong>State.terminal</strong></td>
<td>Boolean flag. Can be changed, but may break execution invariants if changed while executions reference this state.</td>
</tr>
</table>

### 2.3 Execution Reference Contract

`WorkflowExecution` stores state references as **strings** (state codes), not foreign keys:

```java
// WorkflowExecutionEntity
@Column(name = "current_state_code", nullable = false)
private String currentStateCode;
```

This means:

| Mutation | Risk to existing executions |
|---|---|
| **Change `name`** | ✅ Safe — executions only store the code |
| **Change `terminal` flag** | ⚠️ May allow/disallow transitions unexpectedly |
| **Add new state** | ✅ Safe — existing executions don't reference it |
| **Remove unused state** | ✅ Safe — only if no execution references it |
| **Remove state referenced by execution** | ❌ Breaks `currentStateCode` and `history` |
| **Rename `code`** | ❌ Breaks all references (design intent: codes are permanent) |
| **Change `initialState`** | ✅ Safe — only affects new executions |
| **Add/remove transitions** | ⚠️ Safe for past, affects future transitions |

### 2.4 JPA Persistence Behavior

The `WorkflowMapper.toEntity()` creates **new** `StateEntity` and `TransitionEntity` instances on every call (no ID carryover):

```java
StateEntity se = new StateEntity();  // No ID set
se.setCode(s.code());
se.setName(s.name());
se.setTerminal(s.terminal());
se.setWorkflow(entity);
```

The `WorkflowEntity` uses `CascadeType.ALL` + `orphanRemoval = true` on its child collections:

```java
@OneToMany(mappedBy = "workflow", cascade = CascadeType.ALL, orphanRemoval = true)
private List<StateEntity> states;
```

For **CREATE**, JPA generates child entity IDs automatically.  
For **UPDATE**, the mapper must preserve existing child entity IDs to avoid duplicate-key errors. **The current mapper does NOT do this** — updating it is part of the scope.

### 2.5 Summary of Allowed Mutations

| Mutation | Backend validation | Safe with active executions? |
|---|---|---|
| Rename workflow (`name`) | None | ✅ Yes |
| Change `state.name` | None | ✅ Yes |
| Change `state.terminal` | Check no execution references this state | ❌ No (if executions exist) |
| Add state | Validate code uniqueness globally | ✅ Yes |
| Remove state | Check no execution references this code | ❌ No (if referenced) |
| Rename `state.code` | **Not allowed** (permanent identifier) | N/A |
| Change `initialState` | Must reference existing state | ✅ Yes |
| Add transition | Validate from/to exist, no terminal from, no dup | ✅ Yes |
| Remove transition | None | ✅ Yes (only affects future transitions) |

---

## 3. Scope

### In Scope

| Layer | Deliverable |
|---|---|
| **Backend — Domain** | New `UpdateWorkflowUseCase` with execution-aware validation |
| **Backend — API** | `PUT /workflows/{workflowId}` endpoint |
| **Backend — Persistence** | Update `WorkflowMapper.toEntity()` to preserve child entity IDs on update |
| **Backend — API** | `GET /workflows/{workflowId}/editable` — pre-flight check for editability |
| **Backend — Tests** | Unit + integration tests for update use case, mapper, controller |
| **Frontend — Model** | `UpdateWorkflowRequest` interface |
| **Frontend — Service** | `WorkflowApiService.updateWorkflow()` method |
| **Frontend — Service** | `WorkflowApiService.getWorkflowEditability()` method |
| **Frontend — Component** | `WorkflowEditComponent` — standalone, reuses form pattern from `WorkflowCreateComponent` |
| **Frontend — Library** | Export `WorkflowEditComponent` from `public-api.ts` |
| **Frontend — Shell** | `/workflows/:id/edit` route with `WorkflowEditPageComponent` |
| **Frontend — Shell** | "Edit" button on `WorkflowDetailComponent` |
| **Frontend — Tests** | Unit tests for service + component (loading, validation, submit, error, cancel) |

### Out of Scope (explicitly NOT included)

- Workflow versioning (immutable snapshots)
- Git-like diff/history of workflow changes
- Bulk edit
- Conditional transitions or guards
- Drag-and-drop state/transition editors
- Visual graph preview
- Deleting workflows (separate feature)

---

## 4. API Contract

### 4.1 `PUT /workflows/{workflowId}` — Update Workflow

**Request:**

```
PUT /workflows/{workflowId}
Content-Type: application/json
```

```json
{
  "name": "simple-approval-v2",
  "states": [
    { "code": "created", "name": "CREATED", "terminal": false },
    { "code": "in_review", "name": "IN REVIEW", "terminal": false },
    { "code": "approved", "name": "APPROVED", "terminal": true },
    { "code": "rejected", "name": "REJECTED", "terminal": true },
    { "code": "escalated", "name": "ESCALATED", "terminal": false }
  ],
  "transitions": [
    { "from": "created", "to": "in_review" },
    { "from": "in_review", "to": "approved" },
    { "from": "in_review", "to": "rejected" },
    { "from": "in_review", "to": "escalated" },
    { "from": "escalated", "to": "approved" },
    { "from": "escalated", "to": "rejected" }
  ],
  "initialState": "created"
}
```

**Request body rules:**
- `name`: required, non-blank
- `states`: required, min 1
- `states[].code`: required, non-blank, immutable per existing state — new states get new codes
- `states[].name`: required, non-blank
- `transitions`: optional (empty list allowed)
- `initialState`: required, must reference a state code in `states`

**Response `200 OK`:**

```json
{
  "workflowId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response `400 Bad Request`** — validation errors (same as create, plus):

| Condition | Error detail |
|---|---|
| Renamed an existing `state.code` | `states[].code: state code 'old_code' cannot be renamed to 'new_code'` |
| Removed state that is referenced by active executions | `states: state 'in_review' cannot be removed — 3 executions reference it` |
| Changed `terminal` on state referenced by executions | `states[].terminal: state 'in_review' has active executions; cannot change terminal flag` |

**Response `404 Not Found`:**

```json
{
  "type": "about:blank",
  "title": "Not Found",
  "status": 404,
  "detail": "Workflow not found"
}
```

**Response `409 Conflict`:**

```json
{
  "type": "about:blank",
  "title": "Conflict",
  "status": 409,
  "detail": "Workflow has active executions that prevent the requested changes"
}
```

### 4.2 `GET /workflows/{workflowId}/editable` — Editability Pre-flight

Returns information about what restrictions apply before the user starts editing.

**Request:**

```
GET /workflows/{workflowId}/editable
```

**Response `200 OK`:**

```json
{
  "workflowId": "550e8400-e29b-41d4-a716-446655440000",
  "hasExecutions": true,
  "executionCount": 5,
  "restrictions": {
    "renameableStates": ["created", "in_review"],
    "lockedStates": ["approved", "rejected"],
    "lockedReason": "Referenced by 3 executions",
    "canChangeTerminal": false,
    "canRemoveStates": false,
    "canRenameWorkflow": true,
    "canAddStates": true,
    "canChangeInitialState": true,
    "canAddTransitions": true,
    "canRemoveTransitions": true
  }
}
```

If no executions exist, all restrictions are lifted:

```json
{
  "workflowId": "550e8400-e29b-41d4-a716-446655440000",
  "hasExecutions": false,
  "executionCount": 0,
  "restrictions": {
    "renameableStates": ["created", "in_review", "approved", "rejected"],
    "lockedStates": [],
    "lockedReason": null,
    "canChangeTerminal": true,
    "canRemoveStates": true,
    "canRenameWorkflow": true,
    "canAddStates": true,
    "canChangeInitialState": true,
    "canAddTransitions": true,
    "canRemoveTransitions": true
  }
}
```

---

## 5. Backend Design

### 5.1 New Use Case: `UpdateWorkflowUseCase`

```java
@Service
@Transactional
public class UpdateWorkflowUseCase {

    private final WorkflowRepository workflowRepository;
    private final ExecutionRepository executionRepository;

    public UpdateWorkflowUseCase(
            WorkflowRepository workflowRepository,
            ExecutionRepository executionRepository
    ) {
        this.workflowRepository = workflowRepository;
        this.executionRepository = executionRepository;
    }

    public Workflow execute(WorkflowId workflowId, String name,
                            List<State> states, List<Transition> transitions,
                            State initialState) {

        Workflow existing = workflowRepository.findById(workflowId)
            .orElseThrow(() -> new WorkflowNotFoundException(workflowId));

        List<WorkflowExecution> executions = executionRepository.findByWorkflowId(workflowId);

        // Validate constraints against existing executions
        validateEditConstraints(existing, states, transitions, initialState, executions);

        // Build new Workflow with same ID
        Workflow updated = new Workflow(workflowId, name, states, transitions, initialState);
        workflowRepository.save(updated);
        return updated;
    }

    private void validateEditConstraints(
            Workflow existing, List<State> newStates,
            List<Transition> newTransitions, State newInitialState,
            List<WorkflowExecution> executions) {
        // See section 5.2
    }
}
```

### 5.2 Edit Validation Rules

These rules execute **before** persisting. Any violation throws `WorkflowEditException` (HTTP 409):

```text
FOR EACH existing state in the ORIGINAL workflow:
  - If the state.code is MISSING from newStates:
      → Check: is this state referenced by any execution (currentStateCode or history)?
      → If yes → BLOCK with 409 "state X has Y executions, cannot remove"
      → If no  → ALLOW removal

  - If the state.code is PRESENT in newStates but with different terminal:
      → Check: is this state referenced by any execution?
      → If yes → BLOCK with 409 "state X has active executions, cannot change terminal"
      → If no  → ALLOW terminal change

  - If the state.code differs from original:
      → BLOCK: "state codes cannot be renamed"

FOR EACH new state:
  - Validate code uniqueness across entire system (@Column(unique=true))
  - (Same validation as CreateWorkflowUseCase)

FOR transitions:
  - Same validation as CreateWorkflowUseCase (from/to exist, no terminal from, no dupes)
```

### 5.3 Updated `WorkflowMapper.toEntity()` for Update

The current `toEntity()` creates **new** child entities without IDs. For updates, we need to:

1. Load the existing `WorkflowEntity` from the database
2. **Reconcile** child entities by `code`:
   - Existing `StateEntity` with matching `code` → update `name` and `terminal`
   - New `StateEntity` (code not in DB) → create with `@GeneratedValue` ID
   - `StateEntity` in DB but not in new states → orphanRemoval=true deletes it
3. Same for `TransitionEntity` — match by (from_code → to_code) pair

**Alternative simpler approach** (recommended for MVP):

Add a new method `toEntityForUpdate(Workflow workflow)` that:
1. Fetches the existing entity from the repository
2. Updates scalar fields (`name`)
3. Clears and rebuilds child collections using existing child IDs where possible
4. Returns the entity for `repository.save()`

```java
public WorkflowEntity toEntityForUpdate(Workflow workflow) {
    // Load existing entity from DB
    WorkflowEntity entity = jpaRepository.findById(workflow.getId().value())
        .orElseThrow(() -> new IllegalArgumentException("Workflow not found"));

    // Update scalar
    entity.setName(workflow.getName());

    // Build code → existing StateEntity map
    Map<String, StateEntity> existingStatesByCode = entity.getStates().stream()
        .collect(Collectors.toMap(StateEntity::getCode, Function.identity()));

    // Reconcile states
    List<StateEntity> updatedStates = workflow.getStates().stream()
        .map(s -> {
            StateEntity se = existingStatesByCode.get(s.code());
            if (se != null) {
                // Update existing
                se.setName(s.name());
                se.setTerminal(s.terminal());
            } else {
                // Create new
                se = new StateEntity();
                se.setCode(s.code());
                se.setName(s.name());
                se.setTerminal(s.terminal());
                se.setWorkflow(entity);
            }
            return se;
        })
        .collect(Collectors.toList());

    entity.setStates(updatedStates);
    entity.setInitialState(updatedStates.stream()
        .filter(se -> se.getCode().equals(workflow.getInitialState().code()))
        .findFirst()
        .orElseThrow(() -> new IllegalArgumentException("Initial state not found")));

    // Rebuild transitions (delete all existing, insert fresh)
    // TransitionEntity has generated IDs, so we rely on orphanRemoval
    List<TransitionEntity> updatedTransitions = workflow.getTransitions().stream()
        .map(t -> {
            TransitionEntity te = new TransitionEntity();
            te.setWorkflow(entity);
            te.setFrom(findByCode(updatedStates, t.getFrom().code()));
            te.setTo(findByCode(updatedStates, t.getTo().code()));
            return te;
        })
        .collect(Collectors.toList());

    entity.setTransitions(updatedTransitions);
    return entity;
}
```

### 5.4 Execution Check Query

Add to `ExecutionRepository`:

```java
public interface ExecutionRepository {
    // Existing
    Optional<WorkflowExecution> findById(WorkflowExecutionId id);
    void save(WorkflowExecution execution);

    // New
    List<WorkflowExecution> findByWorkflowId(WorkflowId workflowId);
    boolean existsByWorkflowId(WorkflowId workflowId);
    long countByWorkflowId(WorkflowId workflowId);
    boolean existsByCurrentStateCode(String stateCode);
    long countByCurrentStateCode(String stateCode);
    long countByStateCodeInHistory(String stateCode);
}
```

### 5.5 Controller

```java
@PutMapping("/workflows/{workflowId}")
@Operation(summary = "Update an existing workflow definition")
@ApiResponse(responseCode = "200", description = "Workflow updated successfully")
@ApiResponse(responseCode = "400", description = "Invalid request body")
@ApiResponse(responseCode = "404", description = "Workflow not found")
@ApiResponse(responseCode = "409", description = "Edit conflicts with existing executions")
public CreateWorkflowResponse update(
        @PathVariable UUID workflowId,
        @Valid @RequestBody CreateWorkflowRequest request) {
    Map<String, State> statesByCode = workflowRequestMapper.buildStateMap(request);
    List<Transition> transitions = workflowRequestMapper.buildTransitions(request, statesByCode);
    Workflow workflow = updateUseCase.execute(
            new WorkflowId(workflowId),
            request.name(),
            List.copyOf(statesByCode.values()),
            transitions,
            statesByCode.get(request.initialState())
    );
    return new CreateWorkflowResponse(workflow.getId().value());
}
```

Note: Reuses `CreateWorkflowRequest` DTO since the request body is identical.

### 5.6 New Exception: `WorkflowEditException`

```java
public class WorkflowEditException extends RuntimeException {
    private final List<String> violations;

    public WorkflowEditException(String message, List<String> violations) {
        super(message);
        this.violations = violations;
    }

    public List<String> getViolations() { return violations; }
}
```

Add handler in `GlobalExceptionHandler` to return `409 Conflict` with violation details.

---

## 6. Frontend Contract

### 6.1 Models

No new models needed — reuses existing types from `workflow.model.ts`:
- `StateDefinition` — `{ code: string; name: string; terminal: boolean }`
- `TransitionDefinition` — `{ from: string; to: string }`
- `CreateWorkflowRequest` — reused as `UpdateWorkflowRequest` (identical body)

New model for editability check:

```typescript
export interface WorkflowEditability {
  workflowId: string;
  hasExecutions: boolean;
  executionCount: number;
  restrictions: {
    renameableStates: string[];
    lockedStates: string[];
    lockedReason: string | null;
    canChangeTerminal: boolean;
    canRemoveStates: boolean;
    canRenameWorkflow: boolean;
    canAddStates: boolean;
    canChangeInitialState: boolean;
    canAddTransitions: boolean;
    canRemoveTransitions: boolean;
  };
}
```

### 6.2 Service

Add to `services/workflow-api.service.ts`:

```typescript
updateWorkflow(id: string, request: CreateWorkflowRequest): Observable<{ workflowId: string }> {
  return this.http.put<{ workflowId: string }>(
    `${this.config.apiBaseUrl}/workflows/${id}`,
    request,
  );
}

getWorkflowEditability(id: string): Observable<WorkflowEditability> {
  return this.http.get<WorkflowEditability>(
    `${this.config.apiBaseUrl}/workflows/${id}/editable`,
  );
}
```

### 6.3 Component: `WorkflowEditComponent`

**Selector:** `we-workflow-edit`

**Standalone:** Yes

**Imports:** `ReactiveFormsModule`

#### Inputs

| Name | Type | Required | Description |
|---|---|---|---|
| `workflowId` | `string` | Yes | Workflow UUID to edit |

#### Outputs

| Name | Event type | Description |
|---|---|---|
| `workflowUpdated` | `string` (workflow UUID) | Emitted when the API responds successfully |
| `cancel` | `void` | Emitted when user clicks Cancel/Back |
| `errorEvent` | `string` | Emitted on API error |

#### Reactive State

```typescript
readonly loading = signal(true);
readonly loadingError = signal<string | null>(null);
readonly submitting = signal(false);
readonly submitError = signal<string | null>(null);
readonly editability = signal<WorkflowEditability | null>(null);
```

#### Form Structure

The form is **identical** to `WorkflowCreateComponent`'s form (same fields, same validations), with these differences:

1. **Initial values** — populated from `GET /workflows/{workflowId}` on mount
2. **Locked states** — states in `lockedStates[]` show a lock icon and cannot be removed or have their code changed
3. **Terminal checkbox** — disabled for locked states
4. **Remove state button** — hidden/disabled for locked states
5. **Restriction banner** — shown at top if `hasExecutions`:

```
┌──────────────────────────────────────────────────┐
│ ⚠ This workflow has 5 execution(s). Some changes │
│   are restricted. See locked states below.       │
└──────────────────────────────────────────────────┘
```

6. **Submit button text** — "Save Changes" instead of "Create Workflow"
7. **On submit** — calls `PUT` instead of `POST`

#### UI States

| State | Visual |
|---|---|
| **Loading initial data** | Full-page skeleton (reuse from `WorkflowDetailComponent`) |
| **Load error** | Error banner + retry button |
| **Form populated** | Same form as create, with data filled in, restrictions indicated |
| **Submitting** | Submit button shows spinner + "Saving…", inputs disabled |
| **Submit error** | Error banner with server message, form stays filled |
| **Submit success** | Emits `workflowUpdated` with workflow UUID |

#### Template Sketch

```
┌──────────────────────────────────────────────────┐
│  ← Back to workflow detail                       │
│                                                  │
│  Edit Workflow                                   │
│                                                  │
│  ⚠ Restriction banner (if hasExecutions)         │
│                                                  │
│  ┌──────────────────────────────────────────────┐│
│  │  Workflow Name  [_________________________]  ││
│  └──────────────────────────────────────────────┘│
│                                                  │
│  ┌──────────────────────────────────────────────┐│
│  │  States (4)                                  ││
│  │                                              ││
│  │  [created]  [CREATED ]  [Terminal]  [✕]     ││
│  │  [in_review] [IN REVIEW] [Terminal]  [✕]    ││
│  │  [approved]  [APPROVED ] [Terminal🔒]  [🔒] ││
│  │  [rejected]  [REJECTED ] [Terminal🔒]  [🔒] ││
│  │                                              ││
│  │  [+ Add State]                               ││
│  └──────────────────────────────────────────────┘│
│                                                  │
│  Initial State: [created        ▼]               │
│                                                  │
│  ┌──────────────────────────────────────────────┐│
│  │  Transitions (3)                             ││
│  │                                              ││
│  │  [created ▼] → [in_review ▼]        [✕]     ││
│  │  [in_review ▼] → [approved ▼]       [✕]     ││
│  │  [in_review ▼] → [rejected ▼]       [✕]     ││
│  │                                              ││
│  │  [+ Add Transition]                          ││
│  └──────────────────────────────────────────────┘│
│                                                  │
│  [Cancel]                    [Save Changes]      │
│                                                  │
│  ⚠ Error banner (if submitError)                 │
└──────────────────────────────────────────────────┘
```

Note: 🔒 indicates a locked state — user cannot remove it or change its `terminal` flag because executions reference it.

#### Interaction Details

- **On mount**: parallel request `GET /workflows/{id}` + `GET /workflows/{id}/editable`
- Both must succeed before form is shown
- If either fails, show error with retry
- Locked states have their remove button disabled or hidden
- Locked states show a tooltip: "Cannot remove — referenced by N execution(s)"
- Terminal checkbox on locked states is disabled with tooltip
- Removing a non-locked state that has locked-state transitions:
  - Show confirmation dialog: "Removing 'draft' will also remove 1 transition(s). Continue?"
  - This is consistent with existing `removeState()` behavior in `WorkflowCreateComponent`

### 6.4 Integration in Shell App

#### New route: `/workflows/:id/edit`

```typescript
{
  path: 'workflows/:id/edit',
  loadComponent: () => import('./workflow-edit-page.component').then(m => m.WorkflowEditPageComponent),
  title: 'Edit Workflow',
}
```

Note: This route must be defined **after** `/workflows/new` but **before** `/workflows/:id` (or use a different pattern) to avoid param conflicts.

#### New page component: `WorkflowEditPageComponent`

```typescript
@Component({
  selector: 'shell-workflow-edit-page',
  standalone: true,
  imports: [WorkflowEditComponent],
  template: `
    <we-workflow-edit
      [workflowId]="workflowId"
      (workflowUpdated)="onWorkflowUpdated($event)"
      (cancel)="onCancel()"
      (errorEvent)="onError($event)"
    />
  `,
})
export class WorkflowEditPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly errorService = inject(ErrorService);

  get workflowId(): string {
    return this.route.snapshot.paramMap.get('id') ?? '';
  }

  onWorkflowUpdated(workflowId: string): void {
    this.router.navigate(['/workflows', workflowId]);
  }

  onCancel(): void {
    this.location.back();
  }

  onError(message: string): void {
    this.errorService.addError(message);
  }
}
```

#### Update `WorkflowDetailComponent`

Add an **"Edit" button** next to the workflow name, visible when the workflow loads successfully:

```html
@if (!loading() && !error(); as _) {
  @let wf = workflow();
  @if (wf) {
    <div class="we-workflow-detail__name-row">
      <h2 class="we-workflow-detail__name">{{ wf.name }}</h2>
      <a class="we-btn we-btn--edit" [routerLink]="['/workflows', wf.id, 'edit']">
        Edit
      </a>
    </div>
    <!-- ... rest of detail template ... -->
  }
}
```

Since `WorkflowDetailComponent` is in the **library** and routing is a **shell concern**, embed the "Edit" button via a new `@Input()` named `editUrl`:

```typescript
@Input() editUrl?: string;
```

The **shell page** passes the URL; the library component renders a link if provided:

```html
@if (editUrl) {
  <a class="we-btn we-btn--edit" [href]="editUrl">Edit</a>
}
```

Or simpler: emit `edit` output event and let the shell handle navigation:

```typescript
@Output() edit = new EventEmitter<void>();

// In shell page:
// <we-workflow-detail (edit)="router.navigate(['/workflows', workflowId, 'edit'])" />
```

### 6.5 CSS Additions

```css
/* Lock indicator for restricted rows */
.we-dynamic-row--locked .we-btn-icon--remove {
  opacity: 0.3;
  cursor: not-allowed;
  pointer-events: none;
}

.we-lock-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  color: var(--we-text-secondary, #757575);
  font-size: 0.9rem;
  flex-shrink: 0;
}

/* Restriction banner */
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

/* Edit button on detail page */
.we-btn--edit {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 16px;
  border: 1px solid var(--we-primary, #1976d2);
  border-radius: var(--we-border-radius, 8px);
  background: var(--we-bg, #ffffff);
  color: var(--we-primary, #1976d2);
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  text-decoration: none;
  font-family: inherit;
  transition: background 0.15s, color 0.15s;
}

.we-btn--edit:hover {
  background: var(--we-primary, #1976d2);
  color: #ffffff;
}
```

### 6.6 Form UX Considerations (Edge Cases)

| Scenario | Behavior |
|---|---|
| User opens edit for workflow with 0 executions | Full edit mode — all fields editable, no restrictions |
| User opens edit for workflow with 50+ executions | Restriction banner shown. Only name, states with no references, initialState, and transitions can be changed |
| User adds a state with a code that already exists globally | Backend returns 400 with `code must be unique`. Error shown in submit banner |
| User removes all transitions | Allowed — workflow with 0 transitions is valid |
| User removes all states | Blocked by form validation (min 1 state) |
| User changes initialState to a newly added state | Allowed — form validates that initialState is in states list |
| Network error during initial load | Error banner + retry button |
| Network error during submit | Error banner, form stays filled, user can retry |
| Backend 409 Conflict | Error banner shows violation details from response body |
| User edits a locked state's name | Allowed — `state.name` is always mutable |
| User clicks Cancel | Navigates back to workflow detail (no confirmation dialog in MVP) |

### 6.7 Form Validation Rules

Reuses all validation rules from `WorkflowCreateComponent`, plus:

| Field | Additional Rule | Error Message |
|---|---|---|
| Locked state remove button | Disabled | "Cannot remove — state is referenced by N execution(s)" |
| Locked state terminal checkbox | Disabled | "Cannot change terminal flag — state is referenced by N execution(s)" |
| Existing state code input | Readonly (always) | "State code cannot be changed after creation" |

---

## 7. Tests

### 7.1 Backend — `UpdateWorkflowUseCase`

| Test | Description |
|---|---|
| **Update name only** | Rename workflow, verify persistence |
| **Add new state** | Add new state + transitions, verify saved |
| **Remove unused state** | Remove state with no execution references, verify deleted from DB |
| **Remove referenced state → 409** | Remove state that an execution references, expect `WorkflowEditException` |
| **Change terminal on referenced state → 409** | Toggle terminal on state with executions, expect exception |
| **Change terminal on unreferenced state → success** | Toggle terminal flag, verify saved |
| **Rename state code → 400** | Change a state's code, expect validation error |
| **Add transition** | Add new valid transition, verify persisted |
| **Remove transition** | Remove transition, verify orphan removed |
| **Empty transitions list** | Clear all transitions, verify workflow saved with empty list |
| **Workflow not found → 404** | Update non-existent workflow, expect exception |

### 7.2 Backend — `WorkflowMapper.toEntityForUpdate()`

| Test | Description |
|---|---|
| **Update preserves existing entity IDs** | Load entity, update name, verify same DB row updated |
| **Add new state creates StateEntity** | Add new state, verify new row in state table |
| **Remove state deletes StateEntity** | Orphan removal works, verify state row deleted |
| **Transition reconciliation** | After update, transitions in DB match new list exactly |
| **No orphan transition entities** | After removing all transitions, verify transition table is empty for this workflow |

### 7.3 Backend — Controller

| Test | Description |
|---|---|
| `PUT /workflows/{id}` returns 200 | Happy path with valid body |
| `PUT /workflows/{id}` returns 400 | Invalid body (missing name, etc.) |
| `PUT /workflows/{id}` returns 404 | Non-existent workflow ID |
| `PUT /workflows/{id}` returns 409 | Edit violates execution constraints |
| `GET /workflows/{id}/editable` returns restrictions | Verify `lockedStates`, `canRemoveStates` etc. |
| `GET /workflows/{id}/editable` no executions | Verify all `can*` fields are true |

### 7.4 Frontend — Service

| Test | Description |
|---|---|
| `updateWorkflow()` calls `PUT /workflows/{id}` with correct body | Uses `HttpClientTestingController` |
| `updateWorkflow()` returns `{ workflowId }` | Verifies response mapping |
| `getWorkflowEditability()` calls `GET /workflows/{id}/editable` | Verifies URL |
| `getWorkflowEditability()` returns `WorkflowEditability` | Verifies response mapping |

### 7.5 Frontend — Component (`WorkflowEditComponent`)

| Test | Description |
|---|---|
| **Render loading state** | Shows skeleton while fetching initial data |
| **Render load error** | Shows error banner + retry on load failure |
| **Render form with data** | Populates form from API response |
| **Show restriction banner** | Banner visible when `hasExecutions` is true |
| **Locked state remove button disabled** | Remove button disabled for locked states |
| **Locked state terminal checkbox disabled** | Terminal checkbox disabled for locked states |
| **Unlocked state can be removed** | Remove button works for non-locked states |
| **Submit calls updateWorkflow** | Clicking submit triggers PUT request with correct body |
| **Submit loading state** | Button shows spinner + "Saving…" during submit |
| **Submit error** | Error banner shown, form stays filled |
| **Submit success** | Emits `workflowUpdated` with workflow UUID |
| **Cancel** | Emits `cancel` event |
| **Locked states show tooltip** | Verify `title` or tooltip element explains restriction |
| **State code input readonly** | All existing state code inputs are `readonly` |
| **Restriction toggles after removing locked state references** | (Integration) After removing last execution that references a state, that state becomes editable |

### 7.6 Frontend — Shell Page

| Test | Description |
|---|---|
| **Route loads component** | Navigate to `/workflows/:id/edit`, verify component renders |
| **Edit button on detail page** | Verify "Edit" button/link appears when `editUrl` is provided |
| **Edit button navigates correctly** | Click → navigates to `/workflows/:id/edit` |
| **Error event wired to ErrorService** | `errorEvent` connected to `ErrorService.addError()` |

---

## 8. Implementation Order

Recommended sequence to minimize context switching:

1. **Backend — `ExecutionRepository`**: Add `findByWorkflowId()`, `countByCurrentStateCode()`, `countByStateCodeInHistory()`
2. **Backend — JPA adapters**: Implement new repository methods
3. **Backend — `WorkflowMapper.toEntityForUpdate()`**: Add update-specific mapper method
4. **Backend — `UpdateWorkflowUseCase`**: Implement with validation logic
5. **Backend — Controller**: Add `PUT /workflows/{id}` and `GET /workflows/{id}/editable`
6. **Backend — Exception**: Add `WorkflowEditException` + `GlobalExceptionHandler` handler
7. **Backend — Tests**: Write use case + mapper + controller tests
8. **Frontend — Model**: Add `WorkflowEditability` interface
9. **Frontend — Service**: Add `updateWorkflow()` and `getWorkflowEditability()` to `WorkflowApiService`
10. **Frontend — Service tests**: Write unit tests
11. **Frontend — Component**: Create `WorkflowEditComponent` (reuse create component pattern)
12. **Frontend — Component tests**: Write unit tests
13. **Frontend — Library export**: Export `WorkflowEditComponent` from `public-api.ts`
14. **Frontend — Shell page**: Create `WorkflowEditPageComponent` + route `/workflows/:id/edit`
15. **Frontend — Shell detail**: Add "Edit" button/output to `WorkflowDetailComponent`
16. **Verify**: `ng test` + `./gradlew test` + manual smoke test

---

## 9. Open Questions / Decisions Log

| Question | Decision | Rationale |
|---|---|---|
| **Reuse `CreateWorkflowRequest` for update?** | **Yes** — request body is identical | Avoids a new DTO; the backend validates that the workflow exists |
| **Should editing a workflow create a new version?** | **No** — versioning is a separate feature | Keeping it simple; edits are in-place mutations. Versioning can be added later |
| **How to handle locked states in the form?** | **Disable remove button + terminal checkbox** with tooltip | Simplest UI affordance. User can see why the action is blocked |
| **How to handle `state.code` uniqueness?** | **Global unique constraint** on `StateEntity.code` | Existing design. For edit, user cannot rename codes, so this only matters for new states |
| **Should we show a confirmation dialog on Cancel?** | **No** for MVP | Follows existing pattern (no confirmation in create or detail). Can be added later |
| **How to handle the transition rename problem?** | Transitions reference `State` objects by identity, not `code` | When a new `State` is created (new code), it's a new object. Existing transitions reference the old `State` — they get orphan-removed. Clean |
| **Should we batch the initial load (workflow + editability)?** | **Yes** — `forkJoin` both requests | Faster UX; form only renders when both succeed |
| **Mapper: new method or modify existing `toEntity()`?** | **New method** `toEntityForUpdate()` | Keeps the create path simple (no conditional logic). The update path has different entity reconciliation needs |
| **PUT vs POST for update?** | **PUT** — idempotent, full replacement | REST convention for full resource replacement |

---

## 10. Changelog

| Date | Change |
|---|---|
| 2026-06-20 | Initial spec |

---

## Appendix: Key Risks

### Risk 1: `StateEntity.code` Global Unique Constraint

Currently `@Column(unique = true)` on `code` means state codes are unique across **all workflows**, not per workflow. This could be problematic if two workflows want states with the same code (e.g., "approved").

- **Impact**: If the constraint is already enforced, new states cannot reuse codes from other workflows
- **Mitigation**: Check the constraint scope. If problematic, migrate to a `(workflow_id, code)` composite unique constraint

### Risk 2: Orphan Removal Race Condition

When rebuilding the `transitions` list, old `TransitionEntity` instances are orphaned and deleted by JPA. If a concurrent request reads a workflow between the DELETE and INSERT of transitions, it could see an inconsistent state.

- **Impact**: Brief inconsistency window
- **Mitigation**: The `@Transactional` annotation on the use case ensures atomicity at the database level. For read consistency, consider adding `@Lock(LockModeType.PESSIMISTIC_WRITE)` on the workflow entity during update.

### Risk 3: Execution State Drift

After editing a workflow (e.g., adding transitions), existing executions can now transition through paths that didn't exist when they started.

- **Impact**: Could violate user expectations (but not domain invariants)
- **Mitigation**: This is by design — the `WorkflowEngine.transition()` validates against the **current** workflow definition, not the one at execution start time. Document this behavior.
