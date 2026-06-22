import { loadColorMap, saveColorMap, clearColorMap } from './state-color-storage.util';

const STORAGE_KEY = 'we-workflow-state-colors';

describe('state-color-storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // ── saveColorMap ──────────────────────────────────────────────────────────

  describe('saveColorMap', () => {
    it('writes JSON to localStorage under the correct key', () => {
      saveColorMap('wf-1', new Map([['A', '#4CAF50']]));
      expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();
    });

    it('includes version, workflowId, colorMap and timestamp', () => {
      const map = new Map([['A', '#4CAF50'], ['B', '#F44336']]);
      saveColorMap('wf-1', map);

      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
      expect(parsed.version).toBe(1);
      expect(parsed.workflowId).toBe('wf-1');
      expect(parsed.colorMap['A']).toBe('#4CAF50');
      expect(parsed.colorMap['B']).toBe('#F44336');
      expect(typeof parsed.timestamp).toBe('number');
    });

    it('does not throw when storage is unavailable', () => {
      spyOn(localStorage, 'setItem').and.throwError('QuotaExceededError');
      expect(() => saveColorMap('wf-1', new Map([['A', '#4CAF50']]))).not.toThrow();
    });
  });

  // ── loadColorMap ──────────────────────────────────────────────────────────

  describe('loadColorMap', () => {
    it('returns the stored Map for the matching workflowId', () => {
      const map = new Map([['A', '#4CAF50'], ['B', '#F44336']]);
      saveColorMap('wf-1', map);

      const loaded = loadColorMap('wf-1');
      expect(loaded).not.toBeNull();
      expect(loaded!.get('A')).toBe('#4CAF50');
      expect(loaded!.get('B')).toBe('#F44336');
    });

    it('returns null when nothing is stored', () => {
      expect(loadColorMap('wf-1')).toBeNull();
    });

    it('returns null for a mismatched workflowId', () => {
      saveColorMap('wf-1', new Map([['A', '#4CAF50']]));
      expect(loadColorMap('wf-2')).toBeNull();
    });

    it('returns null for corrupt JSON', () => {
      localStorage.setItem(STORAGE_KEY, '{invalid json}');
      expect(loadColorMap('wf-1')).toBeNull();
    });

    it('returns null on version mismatch', () => {
      const stored = {
        version: 999,
        workflowId: 'wf-1',
        colorMap: { A: '#4CAF50' },
        timestamp: Date.now(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
      expect(loadColorMap('wf-1')).toBeNull();
    });

    it('returns null when colorMap contains invalid CSS values', () => {
      const stored = {
        version: 1,
        workflowId: 'wf-1',
        colorMap: { A: 'not-a-color' },
        timestamp: Date.now(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
      expect(loadColorMap('wf-1')).toBeNull();
    });

    it('accepts hsl colour strings as valid', () => {
      const stored = {
        version: 1,
        workflowId: 'wf-1',
        colorMap: { A: 'hsl(110, 65%, 45%)' },
        timestamp: Date.now(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
      const loaded = loadColorMap('wf-1');
      expect(loaded).not.toBeNull();
      expect(loaded!.get('A')).toBe('hsl(110, 65%, 45%)');
    });

    it('returns null when stored colorMap is missing', () => {
      const stored = { version: 1, workflowId: 'wf-1', timestamp: Date.now() };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
      expect(loadColorMap('wf-1')).toBeNull();
    });
  });

  // ── clearColorMap ─────────────────────────────────────────────────────────

  describe('clearColorMap', () => {
    it('removes the entry from localStorage', () => {
      saveColorMap('wf-1', new Map([['A', '#4CAF50']]));
      clearColorMap();
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    it('does not throw when nothing is stored', () => {
      expect(() => clearColorMap()).not.toThrow();
    });
  });

  // ── round-trip ────────────────────────────────────────────────────────────

  describe('round-trip', () => {
    it('save then load returns identical Map contents', () => {
      const original = new Map([
        ['DRAFT', '#4CAF50'],
        ['ACTIVE', 'hsl(110, 65%, 45%)'],
        ['DONE', '#F44336'],
      ]);
      saveColorMap('wf-rt', original);
      const loaded = loadColorMap('wf-rt');

      expect(loaded).not.toBeNull();
      expect(loaded!.size).toBe(3);
      original.forEach((color, code) => {
        expect(loaded!.get(code)).toBe(color);
      });
    });
  });
});
