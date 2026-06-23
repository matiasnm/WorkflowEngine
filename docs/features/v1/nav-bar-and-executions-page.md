# Feature: Navigation Bar and Global Executions Page

Add a persistent top navigation bar and a new page listing all executions across workflows.

## Status

- **Iteration:** TBD
- **Backend:** Not needed (reuses existing endpoints)
- **Frontend:** ❌ Not implemented
- **Dependencies:** None

---

## Table of Contents

1. [Navigation Bar](#1-navigation-bar)
2. [Global Executions Page](#2-global-executions-page)

---

## 1. Navigation Bar

### 1.1 Motivation

The current app has no persistent navigation. Users reach pages through links within content (workflow cards, back buttons), but there is no top-level navigation to jump between major sections. This makes the app feel disjointed — users must navigate back to the workflow list to go anywhere else.

A simple top nav bar gives users:

- At-a-glance orientation of which section they're in
- One-click access to all major sections
- A professional app feel

### 1.2 Scope

| Layer | Deliverable |
|---|---|
| **Shell app** | Top nav bar with links: **Workflows** (home), **Executions**, **Create** |
| **Shell app** | Active route highlighting (underline/highlight the current section) |

### 1.3 Design

The nav bar is a **shell-level concern** (not part of the library) since navigation structure is application-specific.

```
┌──────────────────────────────────────────────────────┐
│  [🚦] Workflow Engine    [Workflows] [Executions] [Create]  │
├──────────────────────────────────────────────────────┤
│                                                      │
│  (router outlet content)                             │
│                                                      │
└──────────────────────────────────────────────────────┘
```

- **Fixed top** — stays visible when scrolling long pages
- **Responsive** — on narrow screens, nav links can wrap or collapse
- **Active state** — the current route's nav item is visually distinct (e.g., underlined or bold)
- **No login/user** — not needed for the MVP

### 1.4 Implementation

#### App Component Template

```html
<shell-error-toast />
<nav class="shell-nav">
  <a class="shell-nav__brand" routerLink="/">
    <span class="shell-nav__icon" aria-hidden="true">🚦</span>
    <span class="shell-nav__title">Workflow Engine</span>
  </a>
  <div class="shell-nav__links">
    <a
      class="shell-nav__link"
      routerLink="/"
      routerLinkActive="shell-nav__link--active"
      [routerLinkActiveOptions]="{ exact: true }"
    >
      Workflows
    </a>
    <a
      class="shell-nav__link"
      routerLink="/executions"
      routerLinkActive="shell-nav__link--active"
    >
      Executions
    </a>
    <a
      class="shell-nav__link"
      routerLink="/workflows/new"
      routerLinkActive="shell-nav__link--active"
    >
      + Create
    </a>
  </div>
</nav>
<main class="shell-container">
  <router-outlet />
</main>
```

#### Nav Bar CSS

```css
.shell-nav {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 0 24px;
  height: 56px;
  background: var(--we-bg, #ffffff);
  border-bottom: 1px solid var(--we-border, #e0e0e0);
  position: sticky;
  top: 0;
  z-index: 100;
  font-family: var(--we-font-family, system-ui, -apple-system, sans-serif);
}

.shell-nav__brand {
  display: flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  color: var(--we-text, #212121);
  font-weight: 700;
  font-size: 1.05rem;
  margin-right: auto;
}

.shell-nav__icon {
  font-size: 1.2rem;
}

.shell-nav__links {
  display: flex;
  align-items: center;
  gap: 4px;
}

.shell-nav__link {
  padding: 8px 16px;
  border-radius: var(--we-border-radius, 8px);
  text-decoration: none;
  color: var(--we-text-secondary, #757575);
  font-size: 0.9rem;
  font-weight: 500;
  transition: background 0.15s, color 0.15s;
}

.shell-nav__link:hover {
  background: var(--we-bg-secondary, #f5f5f5);
  color: var(--we-text, #212121);
}

.shell-nav__link--active {
  color: var(--we-primary, #1976d2);
  background: rgba(25, 118, 210, 0.08);
  font-weight: 600;
}

.shell-nav__link--active:hover {
  background: rgba(25, 118, 210, 0.12);
}
```

#### Container Adjustment

The existing `.shell-container` has `padding-top: var(--we-spacing, 16px)` but no top padding is needed since the nav bar is sticky and has its own height. The `max-width: 960px` is fine, but the container content should push below the nav.

### 1.5 Accessibility

- Nav is a `<nav>` element with no explicit label needed (primary navigation)
- `routerLinkActive` adds `aria-current="page"` automatically in Angular
- Each link has a clear text label

### 1.6 Tests

| Test | Description |
|---|---|
| Nav bar renders with three links | Verify Workflows, Executions, Create links exist |
| Workflows link is active on `/` | Verify `shell-nav__link--active` class present |
| Executions link navigates to `/executions` | Verify URL changes on click |
| Create link navigates to `/workflows/new` | Verify URL changes on click |
| Active link updates on route change | Navigate between routes, verify active class moves |

---

## 2. Global Executions Page

### 2.1 Motivation

Currently, executions are only visible inside a specific workflow's detail page. There is no way to see **all executions across all workflows** in one place. Users who want to:

- Monitor recent execution activity across the system
- Jump directly to an execution without remembering which workflow it belongs to
- Get a health overview of all running/completed executions

need a global executions view.

### 2.2 Scope

| Layer | Deliverable |
|---|---|
| **Backend** | New endpoint `GET /executions` (paginated, most-recent-first) |
| **Frontend service** | New method `listAllExecutions()` in `ExecutionApiPort` |
| **Frontend component** | `AllExecutionsComponent` — standalone, shows all executions with loading/empty/error/success states |
| **Shell page** | `ExecutionsPageComponent` — wraps the component in a page with a title, wires error handling |
| **Shell routes** | Add `/executions` route |

### 2.3 API Contract

#### `GET /api/executions`

**Response `200 OK`:**

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "workflowId": "660e8400-e29b-41d4-a716-446655440001",
    "workflowName": "simple-approval",
    "currentState": {
      "code": "in_review",
      "name": "IN REVIEW",
      "terminal": false
    },
    "currentStateSince": "2026-06-20T10:05:00Z"
  }
]
```

- Returns **all executions** across all workflows, ordered by creation date descending (most recent first).
- Includes `workflowName` so the user knows which workflow each execution belongs to.
- `200` always — if no executions exist, returns `[]`.

#### Backend Implementation Plan

| Step | File | Change |
|---|---|---|
| 1 | `WorkflowExecutionRepository` (port) | Add `List<WorkflowExecution> findAll()` |
| 2 | `JpaWorkflowExecutionRepository` | Add `List<WorkflowExecutionEntity> findAllByOrderByCreatedAtDesc()` |
| 3 | `JpaWorkflowExecutionPersistenceAdapter` | Implement `findAll()` — load all entities, map to domain |
| 4 | `InMemoryWorkflowExecutionRepository` | Implement `findAll()` — return all `storage.values()` |
| 5 | `ExecutionController` | Add `GET /executions` → delegates to use case |
| 6 | `ExecutionResponse` | Add `workflowName: string` field |

### 2.4 Frontend Contract

#### Service

```typescript
// ExecutionApiPort — new method
listAllExecutions(): Observable<AllExecutionResponse[]>
```

#### New Model

```typescript
// models/execution.model.ts
export interface AllExecutionResponse {
  id: string;
  workflowId: string;
  workflowName: string;
  currentState: StateDefinition;
  currentStateSince?: string;
}
```

#### Component: `AllExecutionsComponent`

**Selector:** `we-all-executions`

**Standalone:** Yes

**Imports:** `DatePipe`

##### Inputs

| Name | Type | Required | Description |
|---|---|---|---|
| _(none)_ | | | Loads data autonomously |

##### Outputs

| Name | Event type | Description |
|---|---|---|
| `executionSelected` | `string` (execution UUID) | Emitted when user clicks an execution row |
| `errorEvent` | `string` | Emitted on API error |

##### UI States

| State | Visual |
|---|---|
| **Loading** | Skeleton table with 5 rows (shimmer) |
| **Empty** | "No executions found." centered, dashed border |
| **Error** | `<we-error-banner>` with retry button |
| **Success** | Table: Workflow Name, Execution ID, State, Since |

##### Template Structure

```
┌──────────────────────────────────────────────────────┐
│  Executions                                     ← h2 │
│                                                      │
│  [Loading... skeleton 5 rows]                        │
│                                                      │
│  [Empty state]                                       │
│  ┌──────────────────────────────────────────────┐    │
│  │  No executions found.                        │    │
│  └──────────────────────────────────────────────┘    │
│                                                      │
│  [Error state]                                       │
│  <we-error-banner message="..." [showRetry]="true" />│
│                                                      │
│  [Data loaded]                                       │
│  ┌──────────────────────────────────────────────┐    │
│  │ Workflow     │ ID        │ State    │ Since   │    │
│  ├──────────────────────────────────────────────┤    │
│  │ simple-approval│ a1b2...  │ IN_REVIEW│ 10:05AM│    │
│  │ bug-fix-v2    │ c3d4...   │ CREATED  │ 10:00AM│    │
│  └──────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────┘
```

### 2.5 Tests

#### Backend

| Test level | What to test |
|---|---|
| **Unit — Repository** | `findAll()` returns all executions ordered by creation date |
| **Unit — Controller** | `GET /executions` returns 200 with expected body |
| **Integration** | Full flow: create 2 workflows, start executions on both, call global list, verify all appear |

#### Frontend

| Test level | What to test |
|---|---|
| **Unit — Service** | `listAllExecutions()` calls `GET /executions`, returns `AllExecutionResponse[]` |
| **Unit — Component** | Loading state renders skeleton |
| **Unit — Component** | Empty state renders "No executions found" |
| **Unit — Component** | Error state renders error banner with retry |
| **Unit — Component** | Retry button re-fetches data |
| **Unit — Component** | Success state renders execution rows with workflow name |
| **Unit — Component** | Click on row emits `executionSelected` with correct UUID |

---

## 3. Implementation Order

1. **Nav bar** — Create in `app.component.html` + `app.component.css`
2. **Backend: global executions endpoint** — `GET /executions` with `workflowName`
3. **Frontend: `AllExecutionsComponent`** — New library component
4. **Frontend: `ExecutionsPageComponent`** — New shell page
5. **Route** — Add `/executions` to `app.routes.ts`

---

## 4. Open Questions / Decisions Log

| Question | Decision | Rationale |
|---|---|---|
| Nav bar in library or shell? | **Shell** — navigation structure is application-specific | |
| Global executions paginated? | **Not for MVP** — low expected volume; can add later | |
| Should nav be fixed/sticky? | **Sticky** — stays visible during scroll, less intrusive than fixed | |
| `workflowName` in backend response? | **Yes** — avoids N+1 queries in frontend | |

---

## 5. Changelog

| Date | Change |
|---|---|
| 2026-06-20 | Initial spec |
