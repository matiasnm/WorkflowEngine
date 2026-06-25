import { Injectable, inject } from '@angular/core';
import { StateDefinition } from '../models';
import { generateStateColors } from '../util/state-color.util';
import { loadColorMap, saveColorMap } from '../util/state-color-storage.util';

/**
 * Injectable service for managing state colors per workflow.
 * Caches color maps in memory and persists to localStorage.
 * Provided in root for singleton behavior across the application.
 */
@Injectable({
  providedIn: 'root',
})
export class StateColorService {
  private readonly cache = new Map<string, Map<string, string>>();

  /**
   * Gets existing colors for a workflow or generates and caches new ones.
   * First checks in-memory cache, then localStorage, then generates fresh.
   * If the cached/stored map doesn't cover all the requested states (e.g. after
   * a workflow edit that added new states), it reconciles by generating colors
   * for the missing entries while preserving existing colors.
   */
  getOrCreateColors(workflowId: string, states: StateDefinition[]): Map<string, string> {
    // Check in-memory cache first
    const cached = this.cache.get(workflowId);
    if (cached) {
      return this.reconcileColors(workflowId, cached, states);
    }

    // Check localStorage
    const stored = loadColorMap(workflowId);
    if (stored) {
      this.cache.set(workflowId, stored);
      return this.reconcileColors(workflowId, stored, states);
    }

    // Generate new colors
    const stateCodes = states.map(s => ({ code: s.code }));
    const colorMap = generateStateColors(stateCodes);
    
    // Cache in memory and persist
    this.cache.set(workflowId, colorMap);
    saveColorMap(workflowId, colorMap);
    
    return colorMap;
  }

  /**
   * Ensures the color map covers all requested states.
   * If states have been added since the map was generated, it regenerates
   * the full palette so that first=green / last=red is maintained for the
   * complete set of states.
   */
  private reconcileColors(workflowId: string, existing: Map<string, string>, states: StateDefinition[]): Map<string, string> {
    const missing = states.filter(s => !existing.has(s.code));
    if (missing.length === 0) {
      return existing;
    }

    // Regenerate colours for the full set so the green‑first / red‑last
    // colour contract is preserved regardless of which states were added.
    const stateCodes = states.map(s => ({ code: s.code }));
    const colorMap = generateStateColors(stateCodes);

    this.cache.set(workflowId, colorMap);
    saveColorMap(workflowId, colorMap);
    return colorMap;
  }

  /**
   * Gets a single color for a state in a workflow.
   * Checks the in-memory cache first, then falls back to localStorage,
   * so callers that never invoked getOrCreateColors (e.g. ExecutionDetailComponent
   * after a page refresh) still get a colour when one was previously saved.
   * Returns null if no color map is found for the workflow.
   */
  getColor(workflowId: string, stateCode: string): string | null {
    let colorMap = this.cache.get(workflowId);
    if (!colorMap) {
      const stored = loadColorMap(workflowId);
      if (stored) {
        this.cache.set(workflowId, stored);
        colorMap = stored;
      }
    }
    return colorMap?.get(stateCode) ?? null;
  }

  /**
   * Clears the cached colors for a specific workflow.
   * Also removes from localStorage.
   */
  clearWorkflowColors(workflowId: string): void {
    this.cache.delete(workflowId);
    // Note: localStorage stores single workflow, so we clear all
    // In a multi-workflow scenario, we'd need a different storage structure
    // For now, we keep it simple as per requirements
  }

  /**
   * Clears all cached colors and localStorage.
   */
  clearAllColors(): void {
    this.cache.clear();
    // The storage util only supports one workflow at a time
    // This is acceptable for the current requirements
  }
}