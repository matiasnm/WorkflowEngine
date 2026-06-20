# Feature: Frontend Polish — Skeletons, Shell Error Handling, and Search

Three small UX improvements to harden the frontend after the MVP.

## Status

- **Iteration:** v0.4 (Hardening & Spring Events)
- **Backend:** N/A (frontend-only)
- **Frontend:** ❌ Not implemented
- **Dependencies:** None

---

## Table of Contents

1. [Skeleton Loading Components](#1-skeleton-loading-components)
2. [Shell-Level Error Handling](#2-shell-level-error-handling)
3. [Workflow List Search/Filter](#3-workflow-list-searchfilter)

---

## 1. Skeleton Loading Components

### 1.1 Motivation

All current components show a plain text `"Loading..."` message while fetching data. This is functional but visually jarring — the UI jumps from "Loading..." text to the full rendered list/table. Skeleton/shimmer patterns (grey placeholder blocks that pulse) give a smoother perceived performance and set expectations about the content layout.

The existing feature spec for `execution-list.md` already describes skeleton rows in its UI states table (section 4.2), and `workflow-create.md` mentions extracting shared skeleton CSS as a future improvement. This feature delivers that.

### 1.2 Scope

| Component | Current Loading State | Target Loading State |
|---|---|---|
| `WorkflowListComponent` | `"Loading..."` text | 3 skeleton rows (shimmer blocks mimicking card rows) |
| `WorkflowDetailComponent` | `"Loading..."` text | 2 skeleton blocks (states table + transitions list) |
| `ExecutionDetailComponent` | `"Loading..."` text | Skeleton block with state badge + transition buttons placeholders |
| `ExecutionHistoryComponent` | `"Loading..."` text | 3 horizontal timeline skeleton dots |
| `ExecutionListComponent` | Already planned as skeleton in v0.2 spec | Reuse the shared skeleton classes |

### 1.3 Design

**Shared CSS** in `projects/workflow-engine/src/styles/` (or a `_skeleton.scss` partial):

```css
@keyframes we-shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.we-skeleton {
  background: linear-gradient(
    90deg,
    var(--we-skeleton-base, #e0e0e0) 25%,
    var(--we-skeleton-shine, #f0f0f0) 50%,
    var(--we-skeleton-base, #e0e0e0) 75%
  );
  background-size: 200% 100%;
  animation: we-shimmer 1.5s ease-in-out infinite;
  border-radius: var(--we-border-radius, 4px);
}

.we-skeleton--text {
  height: 1em;
  width: 100%;
  margin-bottom: 0.5em;
}

.we-skeleton--row {
  height: 48px;
  width: 100%;
  margin-bottom: 8px;
}
```

### 1.4 Implementation Per Component

Each component wraps its loading state with skeleton elements matching the layout:

```html
@if (loading()) {
  <div class="we-skeleton-list" aria-label="Loading...">
    <div class="we-skeleton we-skeleton--row"></div>
    <div class="we-skeleton we-skeleton--row"></div>
    <div class="we-skeleton we-skeleton--row"></div>
  </div>
}
```

- Use `aria-label="Loading..."` for accessibility
- Skeleton elements must not be focusable
- No text content inside skeleton elements

### 1.5 CSS Variables

| Variable | Default | Purpose |
|---|---|---|
| `--we-skeleton-base` | `#e0e0e0` | Base skeleton color |
| `--we-skeleton-shine` | `#f0f0f0` | Shimmer highlight color |

These are added to the library's `:root` defaults.

### 1.6 Tests

| Test | Description |
|---|---|
| Component renders skeleton elements when `loading()` is true | Verify skeleton container exists, no text content |
| Skeleton transitions to content when `loading()` becomes false | Verify skeleton removed, content displayed |

---

## 2. Shell-Level Error Handling

### 2.1 Motivation

Each library component emits `@Output() errorEvent` for host app integration, but the **shell app** has no global error handler to consume these events. Currently, errors appear inline inside each component, but there is no toast/snackbar/notification at the shell level.

### 2.2 Scope

| Layer | Deliverable |
|---|---|
| **Shell** | Global error toast component |
| **Shell** | Error handling service to collect errors from library components |
| **Shell** | Integration: all page components pass `errorEvent` → toast |

### 2.3 Implementation

#### Error Service

```typescript
// shell/src/app/error.service.ts
import { Injectable, signal } from '@angular/core';

export interface AppError {
  id: string;
  message: string;
  timestamp: Date;
}

@Injectable({ providedIn: 'root' })
export class ErrorService {
  readonly errors = signal<AppError[]>([]);

  addError(message: string): void {
    const id = crypto.randomUUID();
    this.errors.update(errors => [...errors, { id, message, timestamp: new Date() }]);
    // Auto-dismiss after 8 seconds
    setTimeout(() => this.dismissError(id), 8000);
  }

  dismissError(id: string): void {
    this.errors.update(errors => errors.filter(e => e.id !== id));
  }
}
```

#### Error Toast Component

```typescript
// shell/src/app/error-toast.component.ts
@Component({
  selector: 'shell-error-toast',
  standalone: true,
  template: `
    <div class="shell-error-toast-container">
      @for (error of errorService.errors(); track error.id) {
        <div class="shell-error-toast" role="alert">
          <span>{{ error.message }}</span>
          <button (click)="errorService.dismissError(error.id)" aria-label="Dismiss">✕</button>
        </div>
      }
    </div>
  `,
  styles: [/* ... */],
})
export class ErrorToastComponent {
  readonly errorService = inject(ErrorService);
}
```

#### Integration in Page Components

Each shell page component connects the library component's `errorEvent` to the service:

```typescript
// workflow-list-page.component.ts
protected onError(message: string): void {
  this.errorService.addError(message);
}
```

```html
<we-workflow-list (errorEvent)="onError($event)" />
```

#### Shell Root Template

Add `<shell-error-toast />` to `app.component.ts` template, positioned fixed at top-right.

### 2.4 Error Dismiss Behavior

- Errors auto-dismiss after 8 seconds
- User can manually dismiss by clicking the ✕ button
- If multiple errors arrive, they stack vertically
- Only the shell consumes `errorEvent` — components still show inline errors for local context

### 2.5 Tests

| Test | Description |
|---|---|
| `ErrorService.addError()` adds error to signal | Verify `errors()` length increases |
| `ErrorService.dismissError()` removes by id | Verify only the targeted error is removed |
| `ErrorService` auto-dismisses after timeout | Use fake timers to verify |
| `ErrorToastComponent` renders active errors | Verify toast elements appear |
| Dismiss button works | Verify click dismisses the error |

---

## 3. Workflow List Search/Filter

### 3.1 Motivation

The workflow list (`WorkflowListComponent`) renders all workflows as cards with no way to filter them. As the number of workflows grows, users need to search by name.

### 3.2 Scope

| Layer | Deliverable |
|---|---|
| **Library component** | Add search input to `WorkflowListComponent` |
| **Component logic** | Client-side filter by workflow name (case-insensitive) |

**No backend changes** — filtering is entirely client-side. The backend already returns all workflows (`GET /workflows` returns a list). If scale becomes an issue, a future iteration can add server-side search.

### 3.3 Implementation

#### Component Changes

```typescript
// New reactive state
readonly searchQuery = signal<string>('');
```

```typescript
// Computed filtered list
readonly filteredWorkflows = computed(() => {
  const query = this.searchQuery().toLowerCase();
  if (!query) return this.workflows();
  return this.workflows().filter(w =>
    w.name.toLowerCase().includes(query)
  );
});
```

#### Template Changes

```html
<div class="we-workflow-list">
  <!-- New search input -->
  <div class="we-workflow-list__search">
    <input
      class="we-input we-input--search"
      type="search"
      placeholder="Search workflows..."
      [ngModel]="searchQuery()"
      (ngModelChange)="searchQuery.set($event)"
      aria-label="Search workflows"
    />
  </div>

  <!-- Existing content, using filteredWorkflows instead of workflows -->
  @for (workflow of filteredWorkflows(); track workflow.id) { ... }
</div>
```

- The search input is inside the **library component** (not the shell) because search is intrinsic to the list view
- Uses `type="search"` for native clear button on some browsers
- Filter is instantaneous (computed signal) — no debounce needed at this scale

#### New CSS

```css
.we-workflow-list__search {
  margin-bottom: var(--we-spacing-md, 16px);
}

.we-input--search {
  width: 100%;
  max-width: 400px;
  padding: 8px 12px;
  border: 1px solid var(--we-border-color, #ccc);
  border-radius: var(--we-border-radius, 4px);
}
```

### 3.4 Empty Search Results

When the search query has no matches:
- Show "No workflows match 'query'" message (not the general empty state)
- Keep the search input filled so the user can modify their query

### 3.5 Tests

| Test | Description |
|---|---|
| Search input renders in the component | Verify input element exists |
| Typing in search filters the list | Verify only matching workflows are displayed |
| Empty query shows all workflows | Verify full list when search is cleared |
| No matches shows "No workflows match" message | Verify empty search results state |
| Filter is case-insensitive | Verify "WORKFLOW" matches "workflow" |
| Search remains after workflow reload | Search query state is preserved across the `loading → success` transition |

---

## 4. Implementation Order

1. **Skeleton CSS** — Create shared `_skeleton.scss` with shimmer keyframes + classes
2. **Skeleton per component** — Update each component's loading template
3. **ErrorService + ErrorToastComponent** — Create in shell app
4. **Wire errorEvent** — Connect all page components to ErrorService
5. **Search input** — Add to WorkflowListComponent with computed filter
6. **Tests** — Write tests for all three sub-features

---

## 5. Open Questions / Decisions Log

| Question | Decision | Rationale |
|---|---|---|
| Skeleton in library or shell? | **Library** — components are self-contained; skeleton is part of their loading state | |
| Error toast in library or shell? | **Shell** — error aggregation and display is an application concern, not a library concern | |
| Search client-side or server-side? | **Client-side** — low expected volume of workflows. Server-side search can be added later with a query param. | |
| Search filter debounce? | **No debounce** — computed signal is synchronous and instantaneous at expected scale | |

---

## 6. Changelog

| Date | Change |
|---|---|
| 2026-06-19 | Initial spec |
