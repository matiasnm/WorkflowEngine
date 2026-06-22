const STORAGE_KEY = 'we-workflow-state-colors';
const CURRENT_VERSION = 1;

export interface StoredColorMap {
  version: number;
  workflowId: string;
  colorMap: Record<string, string>;
  timestamp: number;
}

/**
 * Loads a color map from localStorage for a specific workflow.
 * Returns null if not found, corrupted, or version mismatch.
 */
export function loadColorMap(workflowId: string): Map<string, string> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const stored: StoredColorMap = JSON.parse(raw);
    
    // Validate structure
    if (!stored || typeof stored !== 'object') {
      return null;
    }

    // Check version
    if (stored.version !== CURRENT_VERSION) {
      return null;
    }

    // Check workflow ID matches
    if (stored.workflowId !== workflowId) {
      return null;
    }

    // Validate colorMap exists
    if (!stored.colorMap || typeof stored.colorMap !== 'object') {
      return null;
    }

    // Convert to Map
    const colorMap = new Map<string, string>();
    for (const [code, color] of Object.entries(stored.colorMap)) {
      if (typeof color === 'string' && isValidCssColor(color)) {
        colorMap.set(code, color);
      }
    }

    return colorMap.size > 0 ? colorMap : null;
  } catch {
    // Corrupt JSON or any other error
    return null;
  }
}

/**
 * Saves a color map to localStorage for a specific workflow.
 */
export function saveColorMap(workflowId: string, colorMap: Map<string, string>): void {
  try {
    const stored: StoredColorMap = {
      version: CURRENT_VERSION,
      workflowId,
      colorMap: Object.fromEntries(colorMap),
      timestamp: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // Silently fail if storage is full or unavailable
  }
}

/**
 * Clears the color map from localStorage.
 */
export function clearColorMap(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Silently fail
  }
}

/**
 * Validates if a string is a valid CSS color (hex or hsl).
 */
function isValidCssColor(color: string): boolean {
  // Hex color: # followed by 3, 4, 6, or 8 hex digits
  const hexRegex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F0-9]{6}|[a-fA-F0-9]{8})$/;
  
  // HSL color: hsl(h, s%, l%) or hsla(h, s%, l%, a)
  const hslRegex = /^hsla?\(\s*(\d{1,3})\s*,\s*(\d{1,3})%\s*,\s*(\d{1,3})%\s*(?:,\s*[\d.]+)?\s*\)$/;
  
  // RGB color: rgb(r, g, b) or rgba(r, g, b, a)
  const rgbRegex = /^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(?:,\s*[\d.]+)?\s*\)$/;

  return hexRegex.test(color) || hslRegex.test(color) || rgbRegex.test(color);
}