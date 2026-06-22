// Palette ordered green→cool→warm→red so that index 0 is always the first (green)
// and index 11 is always the last (red). Evenly-spaced selection for any N≤12
// guarantees first=green, last=red without special-casing.
const CURATED_PALETTE: readonly string[] = [
  '#4CAF50',  //  0 - Green (first state, hue ~120°)
  '#009688',  //  1 - Teal
  '#03A9F4',  //  2 - Light Blue
  '#2196F3',  //  3 - Blue
  '#3F51B5',  //  4 - Indigo
  '#673AB7',  //  5 - Purple
  '#5C6BC0',  //  6 - Deep Purple
  '#E91E63',  //  7 - Pink
  '#FFC107',  //  8 - Amber
  '#FF7043',  //  9 - Deep Orange 400
  '#FF5722',  // 10 - Deep Orange
  '#F44336',  // 11 - Red (last state, hue ~4°)
] as const;

// Green hue range: 80°–140° (first state)
// Red hue range: 330°–20° — represented as 330°–380° so midpoint stays < 360°
const FIRST_STATE_HUE_MIN = 80;
const FIRST_STATE_HUE_MAX = 140;
const LAST_STATE_HUE_MIN = 330;
const LAST_STATE_HUE_MAX = 380;

const MIN_HUE_SEPARATION = 10;

/**
 * Computes a single colour for a given index and total count.
 *
 * ≤12 states: selects evenly-spaced entries from the curated palette so that
 *   index 0 always maps to palette[0] (green) and index total-1 always maps
 *   to palette[11] (red).  N=12 returns every palette entry in order.
 *
 * >12 states: HSL interpolation from green-range (80°–140°) to red-range
 *   (330°–20°) with at least 10° hue separation between adjacent states.
 */
export function computeColor(index: number, total: number): string {
  if (total === 1) {
    return CURATED_PALETTE[0];
  }

  if (total <= 12) {
    const paletteIndex = Math.round(index * (CURATED_PALETTE.length - 1) / (total - 1));
    return CURATED_PALETTE[paletteIndex];
  }

  // N > 12: HSL interpolation
  if (index === 0) {
    const hue = (FIRST_STATE_HUE_MIN + FIRST_STATE_HUE_MAX) / 2;
    return `hsl(${Math.round(hue)}, 65%, 45%)`;
  }

  if (index === total - 1) {
    const hue = (LAST_STATE_HUE_MIN + LAST_STATE_HUE_MAX) / 2;
    return `hsl(${Math.round(hue % 360)}, 65%, 45%)`;
  }

  const startHue = (FIRST_STATE_HUE_MIN + FIRST_STATE_HUE_MAX) / 2; // 110°
  const endHue   = (LAST_STATE_HUE_MIN + LAST_STATE_HUE_MAX) / 2;   // 355°
  const hueRange = endHue - startHue;                                  // 245°
  const middleCount = total - 2;

  const idealStep = hueRange / (middleCount + 1);
  const step = Math.max(idealStep, MIN_HUE_SEPARATION);

  const hue = startHue + index * step;
  return `hsl(${Math.round(hue % 360)}, 65%, 45%)`;
}

/**
 * Generates a Map of state codes to colours for a given array of states.
 * The order of states in the array determines their colour assignment.
 * First state gets green-range, last state gets red-range.
 */
export function generateStateColors(states: Array<{ code: string }>): Map<string, string> {
  const colorMap = new Map<string, string>();
  const total = states.length;
  
  states.forEach((state, index) => {
    colorMap.set(state.code, computeColor(index, total));
  });
  
  return colorMap;
}