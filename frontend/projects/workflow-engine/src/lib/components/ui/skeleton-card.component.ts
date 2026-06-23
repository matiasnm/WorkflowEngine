import { Component, input } from '@angular/core';

/** Config for a single skeleton line within a skeleton card. */
export interface SkeletonLineConfig {
  /** CSS width value (e.g. '60%', '100px'). Defaults to '100%'. */
  width?: string;
  /** CSS height value (e.g. '14px', '18px'). Defaults to '14px'. */
  height?: string;
  /** Additional CSS class for special styling. */
  className?: string;
}

/**
 * Reusable skeleton card component for loading states.
 * Displays a card with configurable shimmer lines.
 */
@Component({
  selector: 'we-skeleton-card',
  standalone: true,
  template: `
    <div class="we-skeleton-card" [attr.aria-label]="ariaLabel()">
      @for (line of lines(); track $index) {
        <div
          class="we-skeleton-card__line"
          [class.we-skeleton-card__line--title]="line.className === 'title'"
          [class.we-skeleton-card__line--subtitle]="line.className === 'subtitle'"
          [class.we-skeleton-card__line--button]="line.className === 'button'"
          [class.we-skeleton-card__line--timestamp]="line.className === 'timestamp'"
          [style.width]="line.width || '100%'"
          [style.height]="line.height || '14px'"
        ></div>
      }
    </div>
  `,
  styles: [`
    .we-skeleton-card {
      background: var(--we-bg, #ffffff);
      border: 1px solid var(--we-border, #e0e0e0);
      border-radius: var(--we-border-radius, 8px);
      padding: var(--we-spacing, 16px);
      display: flex;
      flex-direction: column;
      gap: var(--we-spacing-sm, 8px);
    }

    .we-skeleton-card__line {
      height: 14px;
      border-radius: var(--we-border-radius-sm, 4px);
      background: linear-gradient(
        90deg,
        var(--we-bg-secondary, #f5f5f5) 25%,
        #e8e8e8 50%,
        var(--we-bg-secondary, #f5f5f5) 75%
      );
      background-size: 200% 100%;
      animation: we-shimmer var(--we-animation-shimmer, 1.5s) ease-in-out infinite;
    }

    .we-skeleton-card__line--title {
      height: 18px;
    }

    .we-skeleton-card__line--subtitle {
      height: 14px;
    }

    .we-skeleton-card__line--button {
      height: 40px;
      border-radius: var(--we-border-radius, 8px);
    }

    .we-skeleton-card__line--timestamp {
      height: 12px;
    }

    @keyframes we-shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
  `],
})
export class SkeletonCardComponent {
  /** Array of line configs to render. Each entry becomes a shimmer line. */
  readonly lines = input<SkeletonLineConfig[]>([{}, {}, {}]);

  /** ARIA label for the skeleton container. */
  readonly ariaLabel = input<string>('Loading');
}
