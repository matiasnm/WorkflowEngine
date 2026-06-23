# Feature: State Color Visualization

Auto-generated color swatches for workflow states, used consistently across the workflow detail table, execution detail card, execution history timeline, and execution list badges.

## Status

- **Iteration:** v0.5 (post-hardening)
- **Backend:** N/A (frontend-only — colors are generated client-side, no API changes)
- **Frontend:** ❌ Not implemented
- **Dependencies:** None

---

## Table of Contents

1. [Motivation](#1-motivation)
2. [Scope](#2-scope)
3. [Color Algorithm](#3-color-algorithm)
4. [Storage Strategy](#4-storage-strategy)
5. [Integration Points](#5-integration-points)
6. [Implementation Plan](#6-implementation-plan)
7. [Tests](#7-tests)
8. [Open Questions / Decisions Log](#8-open-questions--decisions-log)
9. [Changelog](#9-changelog)

---

## 1. Motivation

Workflows can have many states, and users currently see them as plain text labels in tables, cards, and timelines. There is no visual cue to:

- Quickly distinguish one state from another at a glance
- Perceive the progression from initial (green) to terminal (red) states
- Scan the execution list and instantly recognise which state an execution is in
- Build future visualisations like a colour-only history view

Adding deterministic, auto-generated colours to every state representation solves these problems without requiring backend changes or user configuration.

### Design Goals

| Goal | Priority |
|------|----------|
| **Distinguishability** — adjacent states must be visually separable | High |
| **Semantic gradient** — initial states lean green, terminal states lean red | High |
| **Deterministic** — same workflow always produces same colours | High |
| **Primary/secondary priority** — for small N, use standard recognisable colours | Medium |
| **Scalability** — works well for 2 through 30+ states | Medium |
| **Persistence** — colours survive page refresh (localStorage) | Medium |
| **No backend changes** — zero API or database modifications | Hard constraint |

---

## 2. Scope

### In Scope

| Layer | Deliverable |
|---|---|
| **Library utility** | `state-color.util.ts` — pure function implementing the colour algorithm |
| **Library utility** | Storage helpers to persist/retrieve colour maps in localStorage |
| **Library component** | Colour swatch rendered in `WorkflowDetailComponent` states table (new column) |
| **Library component** | Current state card in `ExecutionDetailComponent` coloured with the state's swatch |
| **Library component** | Timeline dots and step names in `ExecutionHistoryComponent` coloured by state |
| **Library component** | State badge colour in `ExecutionListComponent` |
| **Library component** | State badge colour in `AllExecutionsComponent` |
| **Tests** | Unit tests for the colour algorithm and storage helpers |

### Out of Scope (explicitly NOT included)

- **User colour picker** — users cannot choose or override colours in this iteration
- **Backend colour storage** — no database column, no API field for colour
- **Server-side colour generation** — algorithm runs entirely on the client
- **Colour-only history view** — deferred to a future feature
- **Dark mode / high-contrast adaptations** — colours are computed once; future work may include a11y overrides
- **CSS colour variables for every state** — colours are applied via inline styles, not CSS custom properties per state
- **Exportable colour legend** — the swatch column in the states table serves as the legend

---

## 3. Color Algorithm

### 3.1 Design Rationale

The algorithm uses the **HSL colour space** (Hue, Saturation, Lightness) because:

- Hue maps naturally to a colour wheel — easy to distribute N points evenly
- HSL enables independent control of saturation and lightness for additional differentiation
- HSL values are intuitive to read and adjust

The core idea: **walk the hue circle from green (120°) through cyan, blue, purple, pink, and end at red (0°)**, following the "long path" (~300° arc). This gives:

- **Semantic meaning**: initial states are cool (green → teal → blue), terminal states are warm (pink → red)
- **Wide separation**: 300° ÷ N hue degrees between each state
- **Familiar primaries**: the path crosses green, cyan, blue, purple, pink, red — all recognisable colours

For **N ≤ 12**, we short-circuit to a **curated palette** of standard primary/secondary colours chosen for maximum perceptual contrast. This avoids muddy or pastel colours that HSL interpolation can produce for small N.

### 3.2 Curated Palette (N ≤ 12)

```typescript
const CURATED_PALETTE: string[] = [
  '#4CAF50', // Green       (initial / go)
  '#2196F3', // Blue        (active / processing)
  '#FF9800', // Orange      (attention / review)
  '#9C27B0', // Purple      (intermediate)
  '#00BCD4', // Cyan        (transition)
  '#F44336', // Red         (terminal / stop)
  '#FFC107', // Amber       (pending / warning)
  '#3F51B5', // Indigo      (deep processing)
  '#E91E63', // Pink        (almost done)
  '#009688', // Teal        (neutral intermediate)
  '#FF5722', // Deep Orange (final review)
  '#607D8B', // Blue Grey   (archived / terminal)
];
```

The palette order is designed so that the **first state gets green** and **later states trend toward red**, preserving the semantic gradient even in palette mode.

For N < 12, we take the first N colours from the palette. This guarantees:
- N=2: 🟢 Green → 🔴 Red (maximum contrast, traffic-light semantics)
- N=3: 🟢 Green → 🔵 Blue → 🔴 Red (spacing primary colours)
- N=4-12: Progressive fill from the ordered palette

### 3.3 HSL Interpolation (N > 12)

For workflows with more than 12 states, the algorithm interpolates across the hue wheel:

```typescript
function interpolateHSL(index: number, total: number): string {
  // Walk 300° from green (120°) the long way to red (360° ≡ 0°)
  // Path: green → cyan → blue → purple → pink → red
  const startHue = 120;  // green
  const endHue   = 420;  // 360 + 60 = wraps past red to ensure clean ending at red hue
  const hueSpan  = endHue - startHue; // 300°

  const hue = startHue + (index * hueSpan) / (total - 1 || 1);

  // Vary saturation and lightness slightly to add a second dimension of differentiation
  const sat    = 72 + (index % 3) * 6;    // 72%, 78%, 84%
  const light  = 45 + (index % 2) * 8;    // 45%, 53%

  return `hsl(${Math.round(hue) % 360}, ${sat}%, ${light}%)`;
}
```

**Distribution examples:**

| N | Hue spacing | Notes |
|---|-------------|-------|
| 2 | 300° | Green ↔ Red (palette used, not HSL) |
| 3 | 150° | Green → Blue → Red (palette used) |
| 12 | ~27° | Full curated palette |
| 13 | ~23° | 12 palette colours + 1 interpolated gap-filler |
| 20 | ~15.8° | Good differentiation; sat/light variation helps |
| 30 | ~10.3° | Adequate; sat/light variation essential |

### 3.4 Visualisation of the Gradient

```
N=2:   🟢 ──────────────────────────────────────────────── 🔴
N=3:   🟢 ─────────────── 🔵 ──────────────────────────── 🔴
N=5:   🟢 ──── 🔵 ──── 🟣 ──── 🟠 ────────────────── 🔴
N=12:  🟢 🔵 🟠 🟣 🌊 🔴 🟡 🔷 🩷 🌿 🟧 ⚪
N=20:  [smooth gradient with ~16° hue steps + lightness alternation]
```

### 3.5 Edge Cases

| Case | Behaviour |
|---|---|
| **N = 0** (no states) | Return empty map |
| **N = 1** | Return `['#4CAF50']` (green — the only state) |
| **N = 2** | `['#4CAF50', '#F44336']` — green and red from palette |
| **N = 12** | Return first 12 entries from curated palette |
| **N = 13** | 12 palette + 1 interpolated colour inserted at optimal gap |
| **N > 30** | Still works but adjacent hues become close (< 10°); consider adding more palette entries or increasing hueSpan |

---

## 4. Storage Strategy

### 4.1 LocalStorage Schema

```typescript
interface StoredStateColors {
  version: 1;
  colors: {
    [workflowId: string]: {
      [stateCode: string]: string; // "hsl(120, 75%, 50%)" or "#4CAF50"
    };
  };
}
```

- **Storage key**: `we-workflow-state-colors`
- **Version field**: enables future algorithm migrations — if the stored `version` differs from the current algorithm version, the map is regenerated

### 4.2 Behaviour

| Scenario | Behaviour |
|---|---|
| **First visit** | Generate colours via algorithm, persist to localStorage |
| **Subsequent visit** | Load from localStorage (match by `workflowId`) |
| **localStorage unavailable** (private browsing, quota exceeded) | Generate colours each time (deterministic, so no visual change) |
| **State added to workflow** | Generate colour for the new state (append), persist updated map |
| **State removed from workflow** | Remove colour entry, persist updated map |
| **Storage corrupted** | Detect invalid JSON → regenerate all, persist |
| **Algorithm version bump** | Regenerate all on next load, persist with new version |

### 4.3 API

```typescript
// state-color-storage.util.ts

function loadColorMap(): StoredStateColors | null;
function saveColorMap(map: StoredStateColors): void;
function clearColorMap(): void;
```

---

## 5. Integration Points

### 5.1 WorkflowDetailComponent — States Table

Add a **colour swatch column** as the first column. Each `<tr>` gets a swatch dot via inline style.

**Before:**
```
Code        │ Name       │ Terminal
─────────────────────────────────────
created     │ CREATED    │ No
```

**After:**
```
│ Code        │ Name       │ Terminal
──────────────────────────────────────
🟢 created   │ CREATED    │ No
```

The swatch is an inline `<span>` with `style="background-color: <colour>"` and a circle shape via CSS. No new component needed — just a CSS class `.we-state-swatch` added to `shared.css`.

### 5.2 ExecutionDetailComponent — Current State Card

The current state card (`.we-state-card`) uses the state's colour for:
- **Border**: `border-color: <state-colour>` (replaces the static `--we-primary`)
- **Top accent bar**: `::before` background uses the state colour
- **Code text**: `color: <state-colour>` (replaces `--we-primary`)

**Before:**
```
┌────────────────────┐
│▄▄▄▄ (blue accent)  │
│                    │
│    IN_REVIEW       │
│    IN REVIEW       │
│    Since 10:05 AM  │
└────────────────────┘
```

**After** (state is `in_review`, colour blue):
```
┌────────────────────┐
│▄▄▄▄ (blue accent)  │
│                    │
│    IN_REVIEW       │  ← blue text
│    IN REVIEW       │
│    Since 10:05 AM  │
└────────────────────┘
```

### 5.3 ExecutionHistoryComponent — Timeline

**Vertical mode:**
- The timeline dot (`●`) uses the **to-state colour** of each transition event
- The "current" indicator (`▲`) uses the current state's colour
- Connector line colour remains neutral (border grey)

**Before:**
```
● CREATED → IN_REVIEW  10:05 AM
│
● IN_REVIEW → APPROVED  10:10 AM
│
▲ APPROVED (current)
```

**After:**
```
🟢 CREATED → 🔵 IN_REVIEW  10:05 AM
│
🔵 IN_REVIEW → 🟠 APPROVED  10:10 AM
│
🟠 ▲ APPROVED (current)
```

**Horizontal mode:**
- Each step name gets the corresponding state colour
- The current step gets a coloured background tint (`rgba(<colour>, 0.08)`)

**Before:**
```
 CREATED → IN_REVIEW → APPROVED*
```
**After:**
```
 🟢 CREATED → 🔵 IN_REVIEW → 🟠 APPROVED*
```

### 5.4 ExecutionListComponent + AllExecutionsComponent — State Badge

Each execution row shows a coloured badge for its current state:

```
┌─────────────────────────────────────────────┐
│ a1b2...  🟢 IN_REVIEW          Since 10:05  │
│ c3d4...  🔵 CREATED            Since 10:00  │
└─────────────────────────────────────────────┘
```

The badge uses a small inline swatch + the state name, all styled with the state colour.

### 5.5 Colour Swatch CSS

Add to `shared.css`:

```css
.we-state-swatch {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-right: 6px;
  flex-shrink: 0;
  vertical-align: middle;
}
```

### 5.6 Entry Point: Colour Generation Trigger

Colours are generated **once per workflow** when the workflow detail is loaded. The generation flow:

1. `WorkflowDetailComponent` loads workflow data
2. Calls `StateColorService.getOrCreateColors(workflowId, states)` 
3. Service checks localStorage → generates if missing → returns the colour map
4. Components access colours via a shared signal or direct service lookup

**Architecture option:** A lightweight `StateColorService` (injectable, provided in root) that:
- Holds a `Map<string, Map<string, string>>` cache (workflowId → stateCode → colour)
- Exposes `getColors(workflowId, states)` and `getColor(workflowId, stateCode)`
- Handles localStorage read/write transparently
- Regenerates on algorithm version change

---

## 6. Implementation Plan

### Slice 1 — Algorithm + Storage Utility

| Step | File | Change |
|---|---|---|
| 1 | `lib/util/state-color.util.ts` | `generateStateColors(states: StateDefinition[]): Map<string, string>` — pure function |
| 2 | `lib/util/state-color.util.ts` | `computeColor(index: number, total: number): string` — core HSL algorithm |
| 3 | `lib/util/state-color-storage.util.ts` | `loadColorMap()`, `saveColorMap()`, `clearColorMap()` |
| 4 | `lib/util/index.ts` | Re-export new utilities |
| 5 | Tests | Unit tests for algorithm (see [§7 Tests](#7-tests)) |

### Slice 2 — StateColorService

| Step | File | Change |
|---|---|---|
| 1 | `lib/services/state-color.service.ts` | `StateColorService` — injectable, cached colour map, transparent localStorage |
| 2 | `lib/services/index.ts` | Re-export |
| 3 | Tests | Unit test for service (cache hit/miss, storage fallback) |

### Slice 3 — WorkflowDetailComponent (states table swatch)

| Step | File | Change |
|---|---|---|
| 1 | `workflow-detail.component.ts` | Inject `StateColorService`, add swatch column to template |
| 2 | `shared.css` | Add `.we-state-swatch` class |
| 3 | Tests | Verify swatch renders for each state row |

### Slice 4 — ExecutionDetailComponent (current state card)

| Step | File | Change |
|---|---|---|
| 1 | `execution-detail.component.ts` | Bind state colour to card border/accent/code via inline styles |
| 2 | Tests | Verify card uses the correct colour for current state |

### Slice 5 — ExecutionHistoryComponent (timeline colours)

| Step | File | Change |
|---|---|---|
| 1 | `execution-history.component.ts` | Colour timeline dots, step names, current indicator |
| 2 | Tests | Verify vertical timeline dots have correct colours |
| 3 | Tests | Verify horizontal step names have correct colours |

### Slice 6 — ExecutionList + AllExecutions (state badge)

| Step | File | Change |
|---|---|---|
| 1 | `execution-list.component.ts` | Add swatch before state name in each row |
| 2 | `all-executions.component.ts` | Add swatch before state name in each row |
| 3 | Tests | Verify swatch renders in list rows |

---

## 7. Tests

### 7.1 Algorithm Unit Tests

| Test | Description |
|---|---|
| N=1 returns green | Single state always gets `#4CAF50` |
| N=2 returns green and red | `['#4CAF50', '#F44336']` |
| N=3 returns green, blue, red | First 3 from curated palette |
| N=12 returns full curated palette | All 12 palette colours in order |
| N=13 returns 12 palette + 1 interpolation | First 12 from palette, 13th is interpolated |
| N=20 no duplicate colours | All 20 colours have distinct HSL values |
| N=30 no duplicate hues | All hues are unique |
| All returned strings are valid CSS colours | Match `^hsl\(\d+,\s*\d+%,\s*\d+%\)$` or `^#[0-9a-f]{6}$` |
| First state hue is in green range (80°–140°) | Semantics: initial state is green |
| Last state hue is in red range (330°–360° or 0°–20°) | Semantics: terminal state is red |
| Adjacent states have > 10° hue separation | Minimum visual distinction |

### 7.2 Storage Unit Tests

| Test | Description |
|---|---|
| `saveColorMap` writes to localStorage | Verify `localStorage.setItem` was called with correct key |
| `loadColorMap` reads from localStorage | Verify `localStorage.getItem` returns parsed map |
| `loadColorMap` returns null when key missing | Graceful degradation |
| `loadColorMap` returns null on corrupt JSON | JSON parse error handled gracefully |
| Version mismatch triggers regeneration | `loadColorMap` returns null when stored version < current |

### 7.3 Service Unit Tests

| Test | Description |
|---|---|
| `getColors` returns generated map when none stored | First call generates + persists |
| `getColors` returns cached map on second call | No redundant computation |
| Subsequent calls with same workflowId return same colours | Deterministic output |

### 7.4 Component Tests (Visual)

| Component | Test | Description |
|---|---|---|
| `WorkflowDetailComponent` | Swatch renders in each state row | Verify `.we-state-swatch` count equals `states.length` |
| `ExecutionDetailComponent` | Card border matches state colour | Verify inline style `border-color` |
| `ExecutionHistoryComponent` | Timeline dot colour matches to-state | Verify each `we-timeline__dot` inline style |
| `ExecutionHistoryComponent` | Horizontal step name colour | Verify step colour inline style |
| `ExecutionListComponent` | State badge has swatch | Verify swatch element exists per row |

---

## 8. Open Questions / Decisions Log

| Question | Decision | Rationale |
|---|---|---|
| **Algorithm versioning strategy?** | Integer version field in localStorage | Simple to migrate: if stored version < current, regenerate all. No migration logic needed. |
| **What if user has 3 states named [Z, A, M] — should colour order follow definition order or alphabetical?** | **Definition order** — the workflow author defines states in a meaningful sequence; colours should reflect that sequence | |
| **Should terminal states always be red?** | Yes, the algorithm guarantees the terminal state(s) land in the red range | Provides clear visual signal that no further transitions are possible |
| **Should we add a colour legend section?** | No — the swatch column in the states table **is** the legend. A separate legend would duplicate information. | |
| **Saturation/lightness variation: deterministic or random?** | Deterministic (based on `index % 2` / `index % 3`) | Must be reproducible across sessions |
| **Separate service class or just imported functions?** | **Service class** (`StateColorService`) for caching and localStorage integration; pure functions for the algorithm | Service can be injected; pure functions are testable in isolation |
| **CSS approach for swatch: inline style or utility classes?** | **Inline styles** set via `[style.background-color]` binding | Colours are dynamic and arbitrary; generating CSS classes for each state would be wasteful |
| **What about the "Start Execution" button in workflow detail — should it carry a colour?** | No — it is an action, not a state representation. It stays neutral (primary blue). | |

---

## 9. Changelog

| Date | Change |
|---|---|
| 2026-06-22 | Initial spec |
