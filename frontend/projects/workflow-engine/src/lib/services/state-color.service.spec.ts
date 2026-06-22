import { TestBed } from '@angular/core/testing';
import { StateColorService } from './state-color.service';
import { StateDefinition } from '../models';

const STORAGE_KEY = 'we-workflow-state-colors';

const threeStates: StateDefinition[] = [
  { code: 'DRAFT',  name: 'Draft',  terminal: false },
  { code: 'ACTIVE', name: 'Active', terminal: false },
  { code: 'DONE',   name: 'Done',   terminal: true  },
];

describe('StateColorService', () => {
  let service: StateColorService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(StateColorService);
  });

  it('is injectable (providedIn root)', () => {
    expect(service).toBeTruthy();
  });

  // ── getOrCreateColors ─────────────────────────────────────────────────────

  describe('getOrCreateColors', () => {
    it('generates a color map on first call', () => {
      const map = service.getOrCreateColors('wf-1', threeStates);
      expect(map.size).toBe(3);
      expect(map.get('DRAFT')).toBe('#4CAF50');
      expect(map.get('DONE')).toBe('#F44336');
    });

    it('returns the exact same Map reference on a second call (memory cache hit)', () => {
      const first  = service.getOrCreateColors('wf-1', threeStates);
      const second = service.getOrCreateColors('wf-1', threeStates);
      expect(second).toBe(first);
    });

    it('persists the generated map to localStorage', () => {
      service.getOrCreateColors('wf-1', threeStates);
      expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();
    });

    it('loads from localStorage when no in-memory cache exists', () => {
      const stored = {
        version: 1,
        workflowId: 'wf-1',
        colorMap: { DRAFT: '#4CAF50', ACTIVE: '#009688', DONE: '#F44336' },
        timestamp: Date.now(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));

      const map = service.getOrCreateColors('wf-1', threeStates);
      expect(map.get('DRAFT')).toBe('#4CAF50');
      expect(map.get('ACTIVE')).toBe('#009688');
      expect(map.get('DONE')).toBe('#F44336');
    });

    it('regenerates when localStorage has a version mismatch', () => {
      const stale = {
        version: 999,
        workflowId: 'wf-1',
        colorMap: { DRAFT: '#000000', ACTIVE: '#111111', DONE: '#222222' },
        timestamp: Date.now(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stale));

      const map = service.getOrCreateColors('wf-1', threeStates);
      expect(map.get('DRAFT')).toBe('#4CAF50');   // re-generated, not stale
      expect(map.get('DONE')).toBe('#F44336');
    });

    it('caches independently per workflowId', () => {
      const twoStates: StateDefinition[] = [
        { code: 'S', name: 'Start', terminal: false },
        { code: 'E', name: 'End',   terminal: true  },
      ];
      const map1 = service.getOrCreateColors('wf-1', threeStates);
      const map2 = service.getOrCreateColors('wf-2', twoStates);
      expect(map1).not.toBe(map2);
      expect(map1.size).toBe(3);
      expect(map2.size).toBe(2);
    });

    it('all returned colours are valid CSS hex or hsl', () => {
      const map = service.getOrCreateColors('wf-1', threeStates);
      map.forEach(color => {
        expect(color).toMatch(/^(#[0-9a-fA-F]{6}|hsl\(\d+, \d+%, \d+%\))$/);
      });
    });
  });

  // ── getColor ──────────────────────────────────────────────────────────────

  describe('getColor', () => {
    it('returns null when no colors have been loaded for the workflow', () => {
      expect(service.getColor('wf-1', 'DRAFT')).toBeNull();
    });

    it('returns the correct colour after getOrCreateColors', () => {
      service.getOrCreateColors('wf-1', threeStates);
      expect(service.getColor('wf-1', 'DRAFT')).toBe('#4CAF50');
      expect(service.getColor('wf-1', 'DONE')).toBe('#F44336');
    });

    it('returns null for an unknown state code', () => {
      service.getOrCreateColors('wf-1', threeStates);
      expect(service.getColor('wf-1', 'NONEXISTENT')).toBeNull();
    });

    it('returns null for a workflow whose colors were never loaded', () => {
      service.getOrCreateColors('wf-1', threeStates);
      expect(service.getColor('wf-2', 'DRAFT')).toBeNull();
    });

    it('loads from localStorage on cache miss (e.g. after page refresh)', () => {
      const stored = {
        version: 1,
        workflowId: 'wf-1',
        colorMap: { DRAFT: '#4CAF50', ACTIVE: '#009688', DONE: '#F44336' },
        timestamp: Date.now(),
      };
      localStorage.setItem('we-workflow-state-colors', JSON.stringify(stored));

      expect(service.getColor('wf-1', 'DRAFT')).toBe('#4CAF50');
      expect(service.getColor('wf-1', 'DONE')).toBe('#F44336');
    });

    it('returns null when localStorage has a different workflowId', () => {
      const stored = {
        version: 1,
        workflowId: 'wf-other',
        colorMap: { DRAFT: '#4CAF50' },
        timestamp: Date.now(),
      };
      localStorage.setItem('we-workflow-state-colors', JSON.stringify(stored));

      expect(service.getColor('wf-1', 'DRAFT')).toBeNull();
    });
  });
});
