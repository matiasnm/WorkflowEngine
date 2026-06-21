# Feature: Frontend Polish — Navigation, Error UX, Auto-Transitions & History Toggle

Seven UX improvements across navigation, error handling, workflow creation, and execution history display.

## Status

- **Iteration:** v0.4 (Hardening & UX Polish)
- **Backend:** No changes required
- **Frontend:** ❌ Not implemented
- **Dependencies:** None

---

## Table of Contents

1. [Move "New Workflow" Button to Navbar](#1-move-new-workflow-button-to-navbar)
2. [Back Navigation After Workflow Creation → Home](#2-back-navigation-after-workflow-creation--home)
3. [Add Back Button to Executions Page](#3-add-back-button-to-executions-page)
4. [Executions Tab: Aggregate Per-Workflow API Calls](#4-executions-tab-aggregate-per-workflow-api-calls)
5. [Auto-Create Transitions When Adding States](#5-auto-create-transitions-when-adding-states)
6. [History Toggle: Detail vs Condensed View](#6-history-toggle-detail-vs-condensed-view)
7. [Remove Redundant Toast + Inline Error for Load Failures](#7-remove-redundant-toast--inline-error-for-load-failures)

---

## 1. Move "New Workflow" Button to Navbar

**Impact:** The workflows home page becomes cleaner — only the workflow list. The primary create action moves to the persistent navbar, accessible from any page.

**Changes:**
- **`workflow-list-page.component.ts`** — Remove the `+ New Workflow` button from the toolbar
- **`app.component.html`** — Restyle the existing `+ Create` navbar link as a blue primary button and rename to `+ New Workflow`
- **`app.component.css`** — Add `.shell-btn` / `.shell-btn--primary` styles

---

## 2. Back Navigation After Workflow Creation → Home

**Impact:** After creating a workflow, the user lands on the detail page. Pressing **← Back** currently goes to `/workflows/new` (the creation form). Instead, it should go to the workflows home page (`/`).

**Decision:** Pass navigation state `{ from: 'create' }` when navigating from the create page to the detail page. The detail page reads this state; if present, Back navigates to `/` instead of calling `location.back()`.

**Changes:**
- **`workflow-create-page.component.ts`** — Add `state: { from: 'create' }` to the router navigation call
- **`workflow-detail-page.component.ts`** — Read navigation state and conditionally navigate to `/`

---

## 3. Add Back Button to Executions Page

**Impact:** The `/executions` page currently has no way to return to the home page except the navbar. A **← Back** button gives users a consistent navigation pattern across all detail/list pages.

**Changes:**
- **`executions-page.component.ts`** — Add a `← Back` button that navigates to `/`

---

## 4. Executions Tab: Aggregate Per-Workflow API Calls

**Impact:** The backend scopes executions per workflow (`GET /workflows/{workflowId}/executions`) — there is no global endpoint. The Executions tab needs to show executions across all workflows without a global API call.

**Decision:** Create a `WorkflowCacheService` (shell) to cache the workflow list fetched on the home page. `AllExecutionsComponent` (library) receives `WorkflowSummary[]` via `@Input()` and internally handles the aggregation: it calls `GET /workflows/{id}/executions` for each workflow in parallel via `forkJoin`, merges results, and manages loading/error/data states. If no workflows are provided via input, the component fetches them independently as fallback.

**New files:**
- **`workflow-cache.service.ts`** — Signal-based service holding cached `WorkflowSummary[]`

**Changes:**
- **`workflow-list.component.ts`** — Add `@Output() workflowsLoaded` to expose the loaded workflow list
- **`workflow-list-page.component.ts`** — Wire cache population
- **`all-executions.component.ts`** — Accept `@Input() workflows: WorkflowSummary[] | null`; perform per-workbook fetching internally
- **`executions-page.component.ts`** — Wire cache consumption and pass data to component

---

## 5. Auto-Create Transitions When Adding States

**Impact:** When creating a workflow, adding states automatically creates sequential transitions (S1→S2, S2→S3). This saves manual work for linear workflows while still allowing the user to edit or delete auto-created transitions.

**Decision:** The auto-creation fires every time a new state is appended, but only if a previous state exists AND the previous state's code is non-empty (to avoid creating broken transitions). The transition is created from the previous last state to the new state. When a state is removed from the middle of the sequence, the chain is reconnected (e.g., removing S2 from [S1, S2, S3] creates S1→S3). The user can freely edit or delete any auto-created transition.

**Changes:**
- **`workflow-create.component.ts`** — Modify `addState()` to auto-create transition when previous state exists and has a code. Modify `removeState()` to reconnect the chain when a middle state is removed.

---

## 6. History Toggle: Detail vs Condensed View

**Impact:** Users can switch between a detailed vertical timeline (each transition shown with from→to, timestamp) and a condensed horizontal flow (states as connected steps, S1→S2→S3, with no repeated linking states). The condensed view already computes correctly — no repetition.

**Decision:** The toggle lives inside `ExecutionHistoryComponent` itself, so any host app using the component gets the toggle without extra wiring. The toggle controls the internal `displayMode` state. Default is vertical (Detail).

**Changes:**
- **`execution-history.component.ts`** — Add toggle button group and internal `displayMode` signal (default `'vertical'`). Remove the input-based `displayMode` control; the component owns the state.

---

## 7. Remove Redundant Toast + Inline Error for Load Failures

**Impact:** Currently, when a component fails to load data, the user sees both an inline error banner (with Retry button) AND a global toast notification. The inline banner is sufficient; the toast is redundant.

**Decision:** Simply stop emitting `errorEvent` for initial load errors in all library components. The `errorEvent` output is kept only for action errors (transition failure, create failure). Load failures are fully handled by the inline `<we-error-banner>` with Retry button — no toast needed.

**Components to remove `errorEvent` emission from load errors:**
- `WorkflowListComponent`
- `AllExecutionsComponent`
- `ExecutionHistoryComponent`
- `WorkflowDetailComponent`
- `ExecutionDetailComponent`

**Components that keep `errorEvent` for action errors:**
- `WorkflowCreateComponent` — create action error
- `ExecutionDetailComponent` — transition action error

---

## 8. Implementation Order

1. Items 1–3 (button move, back logic, missing back button)
2. Item 7 (toast redundancy)
3. Item 5 (auto-transitions)
4. Item 6 (history toggle)
5. Item 4 (executions aggregation — most complex)

---

## 9. Design Decisions Log

| Decision | Chosen Approach | Rationale |
|---|---|---|---|
| Executions data strategy | Client-side per-workflow aggregation inside `AllExecutionsComponent` (library), receives `WorkflowSummary[]` via `@Input()` | Backend correctly scopes executions per workflow; keeps aggregation logic reusable across host apps |
| Auto-transition trigger | Always when adding a state, if previous state exists and has a non-empty code | Predictable, avoids broken transitions, user can always edit/delete |
| Router context for back navigation | `router.state` (not query params) | Doesn't pollute the URL; fallback to `location.back()` if state unavailable |
| Load error handling | Just don't emit `errorEvent` for load errors; keep it only for action errors | Simplest approach — inline banner is sufficient; action errors still need attention |
| History toggle location | Inside `ExecutionHistoryComponent` (component owns its `displayMode` internally) | Any host app using the component gets the toggle automatically; no extra wiring needed |

---

## 10. Changelog

| Date | Change |
|---|---|
| 2026-06-21 | Initial spec |
