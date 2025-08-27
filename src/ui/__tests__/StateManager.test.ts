/**
 * Basic tests for StateManager
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StateManager } from '../StateManager.js';

describe('StateManager', () => {
  let stateManager: StateManager;

  beforeEach(() => {
    vi.clearAllMocks();
    stateManager = new StateManager();
  });

  it('should create an instance', () => {
    expect(stateManager).toBeInstanceOf(StateManager);
  });

  it('should initialize with default state', () => {
    const state = stateManager.getState();
    
    expect(state).toHaveProperty('currentSong');
    expect(state).toHaveProperty('inputText');
    expect(state).toHaveProperty('validationResult');
    expect(state).toHaveProperty('isLoading');
    expect(state).toHaveProperty('errors');
  });

  it('should update input text', () => {
    const testText = 'Test Song\nF G A';
    stateManager.setInputText(testText);
    
    const state = stateManager.getState();
    expect(state.inputText).toBe(testText);
  });

  it('should set loading state', () => {
    stateManager.setLoading(true);
    
    const state = stateManager.getState();
    expect(state.isLoading).toBe(true);
  });

  it('should add and remove listeners', () => {
    const mockListener = vi.fn();
    
    const unsubscribe = stateManager.subscribe(mockListener);
    stateManager.setInputText('test');
    
    expect(mockListener).toHaveBeenCalled();
    
    unsubscribe();
  });

  it('should destroy properly', () => {
    expect(() => stateManager.destroy()).not.toThrow();
  });
});
