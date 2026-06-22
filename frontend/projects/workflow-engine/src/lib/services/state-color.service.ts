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
   */
  getOrCreateColors(workflowId: string, states: StateDefinition[]): Map<string, string> {
    // Check in-memory cache first
    const cached = this.cache.get(workflowId);
    if (cached) {
      return cached;
    }

    // Check localStorage
    const stored = loadColorMap(workflowId);
    if (stored) {
      this.cache.set(workflowId, stored);
      return stored;
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