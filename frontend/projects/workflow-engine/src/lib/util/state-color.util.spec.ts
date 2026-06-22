import { computeColor, generateStateColors } from './state-color.util';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractHue(color: string): number {
  const match = color.match(/^hsl\((\d+)/);
  if (!match) throw new Error(`Not an HSL color: ${color}`);
  return parseInt(match[1], 10);
}

/** Checks if hue falls in [min, max], with wrap-around support (e.g. 330°–20°). */
function hueInRange(hue: number, min: number, max: number): boolean {
  if (max >= min) return hue >= min && hue <= max;
  return hue >= min || hue <= max; // wrap-around
}

function isValidCss(color: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(color) || /^hsl\(\d+, \d+%, \d+%\)$/.test(color);
}

// ---------------------------------------------------------------------------
// computeColor
// ---------------------------------------------------------------------------

describe('computeColor', () => {
  describe('N=1', () => {
    it('returns #4CAF50', () => {
      expect(computeColor(0, 1)).toBe('#4CAF50');
    });
  });

  describe('N=2', () => {
    it('first state is #4CAF50', () => {
      expect(computeColor(0, 2)).toBe('#4CAF50');
    });

    it('last state is #F44336', () => {
      expect(computeColor(1, 2)).toBe('#F44336');
    });
  });

  describe('N=3', () => {
    it('first state is #4CAF50', () => {
      expect(computeColor(0, 3)).toBe('#4CAF50');
    });

    it('last state is #F44336', () => {
      expect(computeColor(2, 3)).toBe('#F44336');
    });

    it('middle state differs from first and last', () => {
      const mid = computeColor(1, 3);
      expect(mid).not.toBe('#4CAF50');
      expect(mid).not.toBe('#F44336');
    });

    it('3 distinct colours', () => {
      const colors = [computeColor(0, 3), computeColor(1, 3), computeColor(2, 3)];
      expect(new Set(colors).size).toBe(3);
    });
  });

  describe('N=5', () => {
    it('first state is #4CAF50', () => {
      expect(computeColor(0, 5)).toBe('#4CAF50');
    });

    it('last state is #F44336', () => {
      expect(computeColor(4, 5)).toBe('#F44336');
    });

    it('5 distinct colours', () => {
      const colors = Array.from({ length: 5 }, (_, i) => computeColor(i, 5));
      expect(new Set(colors).size).toBe(5);
    });
  });

  describe('N=12 (full curated palette)', () => {
    it('first state is #4CAF50', () => {
      expect(computeColor(0, 12)).toBe('#4CAF50');
    });

    it('last state is #F44336', () => {
      expect(computeColor(11, 12)).toBe('#F44336');
    });

    it('second entry is #009688 (palette[1])', () => {
      expect(computeColor(1, 12)).toBe('#009688');
    });

    it('middle entry (index 6) is #5C6BC0 (palette[6])', () => {
      expect(computeColor(6, 12)).toBe('#5C6BC0');
    });

    it('12 distinct colours', () => {
      const colors = Array.from({ length: 12 }, (_, i) => computeColor(i, 12));
      expect(new Set(colors).size).toBe(12);
    });

    it('all are valid hex', () => {
      for (let i = 0; i < 12; i++) {
        expect(computeColor(i, 12)).toMatch(/^#[0-9a-fA-F]{6}$/);
      }
    });
  });

  describe('N=13 (first HSL case)', () => {
    it('first state is green-range hsl (80°–140°)', () => {
      const color = computeColor(0, 13);
      expect(color).toMatch(/^hsl\(/);
      expect(hueInRange(extractHue(color), 80, 140)).toBeTrue();
    });

    it('last state is red-range hsl (330°–20°)', () => {
      const color = computeColor(12, 13);
      expect(color).toMatch(/^hsl\(/);
      expect(hueInRange(extractHue(color), 330, 20)).toBeTrue();
    });

    it('13 distinct colours', () => {
      const colors = Array.from({ length: 13 }, (_, i) => computeColor(i, 13));
      expect(new Set(colors).size).toBe(13);
    });

    it('all are valid CSS', () => {
      for (let i = 0; i < 13; i++) {
        expect(isValidCss(computeColor(i, 13))).toBeTrue();
      }
    });
  });

  describe('N=20', () => {
    let colors: string[];

    beforeEach(() => {
      colors = Array.from({ length: 20 }, (_, i) => computeColor(i, 20));
    });

    it('produces 20 distinct colours', () => {
      expect(new Set(colors).size).toBe(20);
    });

    it('all are valid CSS', () => {
      colors.forEach(c => expect(isValidCss(c)).toBeTrue());
    });

    it('first state is green-range (80°–140°)', () => {
      expect(hueInRange(extractHue(colors[0]), 80, 140)).toBeTrue();
    });

    it('last state is red-range (330°–20°)', () => {
      expect(hueInRange(extractHue(colors[19]), 330, 20)).toBeTrue();
    });

    it('>10° hue separation between every pair of adjacent states', () => {
      const hues = colors.map(extractHue);
      for (let i = 0; i < hues.length - 1; i++) {
        const diff = Math.abs(hues[i + 1] - hues[i]);
        const circularDiff = Math.min(diff, 360 - diff);
        expect(circularDiff).toBeGreaterThan(10);
      }
    });
  });

  describe('N=30', () => {
    it('generates 30 colours', () => {
      const colors = Array.from({ length: 30 }, (_, i) => computeColor(i, 30));
      expect(colors.length).toBe(30);
    });

    it('all are valid CSS', () => {
      const colors = Array.from({ length: 30 }, (_, i) => computeColor(i, 30));
      colors.forEach(c => expect(isValidCss(c)).toBeTrue());
    });

    it('first is green-range, last is red-range', () => {
      expect(hueInRange(extractHue(computeColor(0, 30)), 80, 140)).toBeTrue();
      expect(hueInRange(extractHue(computeColor(29, 30)), 330, 20)).toBeTrue();
    });
  });
});

// ---------------------------------------------------------------------------
// generateStateColors
// ---------------------------------------------------------------------------

describe('generateStateColors', () => {
  it('N=1 returns Map with one green entry', () => {
    const map = generateStateColors([{ code: 'DRAFT' }]);
    expect(map.size).toBe(1);
    expect(map.get('DRAFT')).toBe('#4CAF50');
  });

  it('N=2 returns green first and red last', () => {
    const map = generateStateColors([{ code: 'START' }, { code: 'END' }]);
    expect(map.get('START')).toBe('#4CAF50');
    expect(map.get('END')).toBe('#F44336');
  });

  it('N=3 maps each code to a distinct colour', () => {
    const map = generateStateColors([{ code: 'A' }, { code: 'B' }, { code: 'C' }]);
    expect(map.size).toBe(3);
    expect(map.get('A')).toBe('#4CAF50');
    expect(map.get('C')).toBe('#F44336');
    const mid = map.get('B')!;
    expect(mid).not.toBe('#4CAF50');
    expect(mid).not.toBe('#F44336');
  });

  it('N=5 returns 5 mapped colours with correct first and last', () => {
    const states = ['A', 'B', 'C', 'D', 'E'].map(code => ({ code }));
    const map = generateStateColors(states);
    expect(map.size).toBe(5);
    expect(map.get('A')).toBe('#4CAF50');
    expect(map.get('E')).toBe('#F44336');
  });

  it('N=12 returns 12 mapped colours', () => {
    const states = Array.from({ length: 12 }, (_, i) => ({ code: `S${i}` }));
    const map = generateStateColors(states);
    expect(map.size).toBe(12);
    expect(map.get('S0')).toBe('#4CAF50');
    expect(map.get('S11')).toBe('#F44336');
  });

  it('N=20 returns Map with 20 entries', () => {
    const states = Array.from({ length: 20 }, (_, i) => ({ code: `S${i}` }));
    const map = generateStateColors(states);
    expect(map.size).toBe(20);
  });

  it('N=30 returns Map with 30 entries', () => {
    const states = Array.from({ length: 30 }, (_, i) => ({ code: `S${i}` }));
    const map = generateStateColors(states);
    expect(map.size).toBe(30);
  });

  it('all returned colour strings are valid CSS', () => {
    const states = Array.from({ length: 15 }, (_, i) => ({ code: `S${i}` }));
    const map = generateStateColors(states);
    map.forEach(color => expect(isValidCss(color)).toBeTrue());
  });
});
