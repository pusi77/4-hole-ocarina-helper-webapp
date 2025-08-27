/**
 * Application state management types
 */

import type { Song, ChartConfig } from './core.js';
import type { ValidationResult, ValidationError } from './validation.js';

/**
 * Main application state interface
 */
export interface AppState {
  currentSong: Song | null;
  inputText: string;
  validationResult: ValidationResult;
  chartConfig: ChartConfig;
  isLoading: boolean;
  errors: ValidationError[];
  isExporting: boolean;
  lastUpdateTimestamp: Date;
}

/**
 * UI state for responsive layout
 */
export interface UIState {
  isMobile: boolean;
  isInputCollapsed: boolean;
  isPreviewCollapsed: boolean;
  canvasSize: {
    width: number;
    height: number;
  };
}

/**
 * State update listener function type
 */
export type StateListener = (state: AppState) => void;

/**
 * Partial state update type for state manager
 */
export type StateUpdate = Partial<AppState>;
