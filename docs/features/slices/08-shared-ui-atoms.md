# Slice 8 — Shared UI atom components

**Type:** AFK
**Blocked by:** None — can start immediately

## Parent

Derived from opportunity \#5 in `docs/features/frontend-architecture-deepening.md` — "Extraer átomos de UI compartidos de los estilos duplicados".

## What to build

Create reusable UI atom components and/or shared styles to eliminate the ~240 lines of duplicated CSS (shimmer animations, skeleton lines, error banners, spinners) currently copied across all 6 components.

### Approach A: Shared stylesheet (minimum)

Create a shared CSS file at `src/lib/styles/shared.css` containing:
- `@keyframes we-shimmer` (duplicated in every component)
- `@keyframes we-spin` (duplicated in every component)
- Shared class definitions for `.we-skeleton-line`, `.we-error-banner`, `.we-spinner`, etc.

Components import the shared file via Angular's `styleUrl` or `@import`.

### Approach B: Atom components (preferred, per document)

| Component | Selector | Inputs | Outputs |
|---|---|---|---|
| `ErrorBannerComponent` | `we-error-banner` | `message: string` (required), `showRetry: boolean` | `retry: void` |
| `SkeletonCardComponent` | `we-skeleton-card` | `lines: SkeletonLineConfig[]` (number of lines, widths) | — |
| `SpinnerComponent` | `we-spinner` | `size: 'small' \| 'medium'`, `label: string` | — |
| `RetryButtonComponent` | `we-retry-button` | — | `retry: void` |

Each atom component includes its own ARIA attributes, styles, and template markup — everything currently duplicated.

### Migration

Update all 6 library components to use the atom components:
1. Replace inline error banners with `<we-error-banner>`
2. Replace skeleton markup with `<we-skeleton-card>`
3. Replace inline spinners with `<we-spinner>`
4. Remove the duplicated `@keyframes` and CSS classes from each component's `styles` array

### Optional: Also extract `we-btn` shared button styles

The `.we-btn--back`, `.we-btn--retry`, `.we-btn--start`, `.we-btn--transition`, `.we-btn--submit` button styles are also duplicated. These could be extracted to a shared button component or stylesheet.

## Acceptance criteria

- [ ] Shared stylesheet or atom components created in `src/lib/ui/` or `src/lib/styles/`
- [ ] At minimum: `@keyframes we-shimmer`, `@keyframes we-spin`, skeleton/shimer styles, error banner styles, spinner styles extracted from every component
- [ ] Each component's `styles` array reduced — no duplicated keyframes or shared visual classes
- [ ] All components still render with identical visual appearance
- [ ] All existing tests pass
- [ ] Barrel exports updated for new components (if atom approach)
