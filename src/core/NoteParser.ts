/**
 * NoteParser - Handles parsing of text input into Song objects
 * Includes validation, note conversion, and error reporting
 */

import type {
  Song,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  SupportedNote
} from '../types/index.js';
import {
  ErrorType,
  WarningType,
  SUPPORTED_NOTES
} from '../types/index.js';

/**
 * Configuration for note parsing behavior
 */
interface ParseConfig {
  autoConvertB: boolean;
  strictValidation: boolean;
  maxLines: number;
  maxNotesPerLine: number;
}

/**
 * Default parsing configuration
 */
const DEFAULT_CONFIG: ParseConfig = {
  autoConvertB: true,
  strictValidation: true,
  maxLines: 100,
  maxNotesPerLine: 50
};

/**
 * NoteParser class for converting text input to Song objects
 */
export class NoteParser {
  private config: ParseConfig;

  constructor(config: Partial<ParseConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Parse text input into a Song object
   * @param input Raw text input from user
   * @returns Parsed Song object
   */
  parseSong(input: string): Song {
    const validation = this.validateInput(input);
    
    if (!validation.isValid) {
      throw new Error(`Parsing failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    const lines = this.preprocessInput(input);
    const title = this.extractTitle(lines);
    const noteLines = this.parseNoteLines(lines.slice(1)); // Skip title line

    return {
      title,
      lines: noteLines,
      metadata: {
        originalInput: input,
        parseTimestamp: new Date(),
        noteCount: noteLines.flat().length
      }
    };
  }

  /**
   * Validate input text and return detailed validation result
   * @param input Raw text input
   * @returns ValidationResult with errors and warnings
   */
  validateInput(input: string): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Check for empty input
    if (!input || input.trim().length === 0) {
      errors.push({
        type: ErrorType.EMPTY_INPUT,
        message: 'Input cannot be empty',
        suggestions: ['Enter song notation or load an example song']
      });
      return { isValid: false, errors, warnings };
    }

    const lines = this.preprocessInput(input);
    
    // Check for minimum content (title + at least one line of notes)
    if (lines.length < 2) {
      errors.push({
        type: ErrorType.PARSING_ERROR,
        message: 'Input must contain a title and at least one line of notes',
        suggestions: ['Add a title on the first line and notes on subsequent lines']
      });
    }

    // Check line count limits
    if (lines.length > this.config.maxLines) {
      errors.push({
        type: ErrorType.PARSING_ERROR,
        message: `Too many lines (${lines.length}). Maximum allowed: ${this.config.maxLines}`,
        suggestions: ['Split large songs into smaller sections']
      });
    }

    // Validate each line of notes (skip title line)
    for (let i = 1; i < lines.length; i++) {
      const lineValidation = this.validateNoteLine(lines[i], i + 1);
      errors.push(...lineValidation.errors);
      warnings.push(...lineValidation.warnings);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Convert notes with automatic B to Bb conversion
   * @param notes Array of note strings
   * @returns Converted notes array and warnings
   */
  convertNotes(notes: string[]): { notes: string[]; warnings: ValidationWarning[] } {
    const warnings: ValidationWarning[] = [];
    const convertedNotes: string[] = [];

    for (const note of notes) {
      if (note.toUpperCase() === 'B' && this.config.autoConvertB) {
        convertedNotes.push('Bb');
        warnings.push({
          type: WarningType.NOTE_CONVERSION,
          message: `Converted 'B' to 'Bb' (4-hole ocarinas use Bb instead of B)`
        });
      } else {
        convertedNotes.push(note);
      }
    }

    return { notes: convertedNotes, warnings };
  }

  /**
   * Preprocess input text into clean lines
   * @param input Raw input text
   * @returns Array of cleaned lines
   */
  private preprocessInput(input: string): string[] {
    return input
      .split(/\r?\n/)
      .map(line => line.trim());
  }

  /**
   * Extract song title from first line
   * @param lines Array of input lines
   * @returns Song title
   */
  private extractTitle(lines: string[]): string {
    if (lines.length === 0) {
      return 'Untitled Song';
    }

    const titleLine = lines[0].trim();
    
    // If first line is empty, use default title
    if (titleLine.length === 0) {
      return 'Untitled Song';
    }
    
    // Remove common prefixes like "Title:", "Song:", etc.
    const cleanTitle = titleLine
      .replace(/^(title|song|name):\s*/i, '')
      .trim();

    return cleanTitle || 'Untitled Song';
  }

  /**
   * Parse note lines into arrays of notes
   * @param lines Array of note lines (excluding title)
   * @returns Array of note arrays
   */
  private parseNoteLines(lines: string[]): string[][] {
    const noteLines: string[][] = [];

    for (const line of lines) {
      if (line.trim().length === 0) {
        continue; // Skip empty lines
      }

      const notes = this.parseNotesFromLine(line);
      if (notes.length > 0) {
        noteLines.push(notes);
      }
    }

    return noteLines;
  }

  /**
   * Parse individual notes from a line of text
   * @param line Single line of note text
   * @returns Array of parsed notes
   */
  private parseNotesFromLine(line: string): string[] {
    // Split by common separators: space, comma, pipe, dash
    const rawNotes = line
      .split(/[\s,|\-]+/)
      .map(note => note.trim())
      .filter(note => note.length > 0);

    const { notes } = this.convertNotes(rawNotes);
    
    // Normalize case for supported notes
    return notes.map(note => {
      const upperNote = note.toUpperCase();
      if (upperNote === 'BB') return 'Bb';
      if (SUPPORTED_NOTES.includes(upperNote as SupportedNote)) {
        return upperNote;
      }
      return note; // Keep original case for unsupported notes (will be caught in validation)
    });
  }

  /**
   * Validate a single line of notes
   * @param line Line text to validate
   * @param lineNumber Line number for error reporting
   * @returns ValidationResult for the line
   */
  private validateNoteLine(line: string, lineNumber: number): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (line.trim().length === 0) {
      warnings.push({
        type: WarningType.EMPTY_LINE,
        message: `Line ${lineNumber} is empty`,
        line: lineNumber
      });
      return { isValid: true, errors, warnings };
    }

    // Parse raw notes before conversion to check for B notes
    const rawNotes = line
      .split(/[\s,|\-]+/)
      .map(note => note.trim())
      .filter(note => note.length > 0);

    // Check for B notes that will be converted
    for (let i = 0; i < rawNotes.length; i++) {
      if (rawNotes[i].toUpperCase() === 'B' && this.config.autoConvertB) {
        warnings.push({
          type: WarningType.NOTE_CONVERSION,
          message: `Note 'B' will be converted to 'Bb'`,
          line: lineNumber,
          position: i + 1
        });
      }
    }

    const notes = this.parseNotesFromLine(line);

    // Check note count per line
    if (notes.length > this.config.maxNotesPerLine) {
      errors.push({
        type: ErrorType.PARSING_ERROR,
        message: `Too many notes on line ${lineNumber} (${notes.length}). Maximum: ${this.config.maxNotesPerLine}`,
        line: lineNumber,
        suggestions: ['Split long lines into multiple shorter lines']
      });
    }

    // Validate each note (after conversion)
    for (let i = 0; i < notes.length; i++) {
      const note = notes[i];
      const noteValidation = this.validateNote(note, lineNumber, i + 1);
      errors.push(...noteValidation.errors);
      // Don't add conversion warnings here since we already added them above
      warnings.push(...noteValidation.warnings.filter(w => w.type !== WarningType.NOTE_CONVERSION));
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate a single note
   * @param note Note to validate
   * @param lineNumber Line number for error reporting
   * @param position Position in line for error reporting
   * @returns ValidationResult for the note
   */
  private validateNote(note: string, lineNumber: number, position: number): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Normalize note for comparison (handle case insensitive)
    const normalizedNote = note.charAt(0).toUpperCase() + note.slice(1).toLowerCase();

    // Check if note is supported (after normalization)
    if (!SUPPORTED_NOTES.includes(normalizedNote as SupportedNote)) {
      // Special case for 'B' - provide helpful suggestion
      if (note.toUpperCase() === 'B') {
        if (this.config.autoConvertB) {
          warnings.push({
            type: WarningType.NOTE_CONVERSION,
            message: `Note 'B' will be converted to 'Bb'`,
            line: lineNumber,
            position
          });
        } else {
          errors.push({
            type: ErrorType.UNSUPPORTED_NOTE,
            message: `Unsupported note '${note}' at line ${lineNumber}, position ${position}`,
            line: lineNumber,
            position,
            suggestions: ['Use Bb instead of B for 4-hole ocarinas', ...SUPPORTED_NOTES]
          });
        }
      } else {
        errors.push({
          type: ErrorType.UNSUPPORTED_NOTE,
          message: `Unsupported note '${note}' at line ${lineNumber}, position ${position}`,
          line: lineNumber,
          position,
          suggestions: [`Supported notes: ${SUPPORTED_NOTES.join(', ')}`]
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get list of supported notes
   * @returns Array of supported note names
   */
  static getSupportedNotes(): readonly SupportedNote[] {
    return SUPPORTED_NOTES;
  }

  /**
   * Check if a note is supported
   * @param note Note to check
   * @returns True if note is supported
   */
  static isNoteSupported(note: string): note is SupportedNote {
    return SUPPORTED_NOTES.includes(note as SupportedNote);
  }
}