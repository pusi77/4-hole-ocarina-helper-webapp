/**
 * Main types export file
 * Provides centralized access to all type definitions
 */

// Core types
export type {
  Song,
  FingeringPattern,
  ChartConfig,
  LayoutInfo,
} from './core.js';

// Validation types
export type {
  ValidationError,
  ValidationWarning,
  ValidationResult,
  SupportedNote,
  AcceptedFileType,
} from './validation.js';

export {
  ErrorType,
  WarningType,
  SUPPORTED_NOTES,
  ACCEPTED_FILE_TYPES,
} from './validation.js';

// State management types
export type { AppState, UIState, StateListener, StateUpdate } from './state.js';

// Example songs types
export type { ExampleSong } from './examples.js';

export { ExampleCategory } from './examples.js';
