/**
 * Validation and error handling types
 */

/**
 * Types of errors that can occur in the application
 */
export enum ErrorType {
  INVALID_FILE_TYPE = 'invalid_file_type',
  UNSUPPORTED_NOTE = 'unsupported_note',
  EMPTY_INPUT = 'empty_input',
  PARSING_ERROR = 'parsing_error',
  RENDERING_ERROR = 'rendering_error',
  EXPORT_ERROR = 'export_error'
}

/**
 * Types of validation warnings
 */
export enum WarningType {
  NOTE_CONVERSION = 'note_conversion',
  EMPTY_LINE = 'empty_line',
  PERFORMANCE_WARNING = 'performance_warning'
}

/**
 * Represents a validation error with context
 */
export interface ValidationError {
  type: ErrorType;
  message: string;
  line?: number;
  position?: number;
  suggestions?: string[];
}

/**
 * Represents a validation warning
 */
export interface ValidationWarning {
  type: WarningType;
  message: string;
  line?: number;
  position?: number;
}

/**
 * Result of input validation
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

/**
 * Supported notes for 4-hole ocarina
 */
export const SUPPORTED_NOTES = ['F', 'G', 'A', 'Bb', 'C', 'D', 'E'] as const;
export type SupportedNote = typeof SUPPORTED_NOTES[number];

/**
 * File types accepted by the application
 */
export const ACCEPTED_FILE_TYPES = ['text/plain', 'text/txt'] as const;
export type AcceptedFileType = typeof ACCEPTED_FILE_TYPES[number];