/**
 * Fingering Engine for 4-hole Ocarina
 * 
 * This class manages the fingering patterns for a 4-hole ocarina and provides
 * methods to look up patterns and validate notes against supported patterns.
 */

import type { FingeringPattern } from '../types/core.js';
import { SUPPORTED_NOTES, ErrorType } from '../types/validation.js';
import type { SupportedNote, ValidationResult, ValidationError } from '../types/validation.js';

/**
 * Definitive fingering pattern database for 4-hole ocarina
 * Holes array represents: [top-left, top-right, bottom-left, bottom-right]
 * true = covered, false = open
 * 
 * Based on requirements 3.4: exact fingering patterns specified
 */
const FINGERING_PATTERNS: Record<SupportedNote, FingeringPattern> = {
  'F': { note: 'F', holes: [true, true, true, true] },      // All covered
  'G': { note: 'G', holes: [true, false, true, true] },    // Top-left, bottom-left, bottom-right
  'A': { note: 'A', holes: [true, true, true, false] },    // Top-left, top-right, bottom-left
  'Bb': { note: 'Bb', holes: [true, false, true, false] }, // Top-left, bottom-left
  'C': { note: 'C', holes: [false, false, true, true] },   // Bottom-left, bottom-right
  'D': { note: 'D', holes: [false, false, true, false] },  // Bottom-left only
  'E': { note: 'E', holes: [false, true, false, false] }   // Top-right only
};

/**
 * Engine for managing ocarina fingering patterns
 */
export class FingeringEngine {
  /**
   * Get the fingering pattern for a specific note
   * @param note - The note to get the pattern for
   * @returns The fingering pattern or null if note is not supported
   */
  public getPattern(note: string): FingeringPattern | null {
    const normalizedNote = this.normalizeNote(note);
    
    if (!this.isSupported(normalizedNote)) {
      return null;
    }
    
    return FINGERING_PATTERNS[normalizedNote as SupportedNote];
  }

  /**
   * Get fingering patterns for multiple notes
   * @param notes - Array of notes to get patterns for
   * @returns Array of fingering patterns (null for unsupported notes)
   */
  public getPatterns(notes: string[]): (FingeringPattern | null)[] {
    return notes.map(note => this.getPattern(note));
  }

  /**
   * Check if a note is supported by the 4-hole ocarina
   * @param note - The note to check
   * @returns True if the note is supported
   */
  public isSupported(note: string): boolean {
    const normalizedNote = this.normalizeNote(note);
    return SUPPORTED_NOTES.includes(normalizedNote as SupportedNote);
  }

  /**
   * Get all supported notes
   * @returns Array of all supported note names
   */
  public getSupportedNotes(): readonly SupportedNote[] {
    return SUPPORTED_NOTES;
  }

  /**
   * Validate an array of notes against supported patterns
   * @param notes - Array of notes to validate
   * @returns Validation result with errors for unsupported notes
   */
  public validateNotes(notes: string[]): ValidationResult {
    const errors: ValidationError[] = [];
    
    for (let i = 0; i < notes.length; i++) {
      const note = notes[i];
      const normalizedNote = this.normalizeNote(note);
      
      if (!this.isSupported(normalizedNote)) {
        errors.push({
          type: ErrorType.UNSUPPORTED_NOTE,
          message: `Note "${note}" is not supported by 4-hole ocarina`,
          position: i,
          suggestions: this.getSuggestions(normalizedNote)
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: []
    };
  }

  /**
   * Get all fingering patterns as a readonly record
   * @returns All fingering patterns
   */
  public getAllPatterns(): Readonly<Record<SupportedNote, FingeringPattern>> {
    return FINGERING_PATTERNS;
  }

  /**
   * Normalize note name (trim whitespace, handle case)
   * @param note - Raw note string
   * @returns Normalized note string
   */
  private normalizeNote(note: string): string {
    return note.trim();
  }

  /**
   * Get suggestions for unsupported notes
   * @param note - The unsupported note
   * @returns Array of suggested alternatives
   */
  private getSuggestions(note: string): string[] {
    const suggestions: string[] = [];
    
    // Common note conversion suggestions
    if (note.toLowerCase() === 'b') {
      suggestions.push('Bb');
    }
    
    // Suggest nearby notes based on common musical patterns
    const noteMap: Record<string, string[]> = {
      'B': ['Bb', 'A', 'C'],
      'Db': ['D', 'C'],
      'Eb': ['E', 'D'],
      'Gb': ['G', 'F'],
      'Ab': ['A', 'G']
    };
    
    if (noteMap[note]) {
      suggestions.push(...noteMap[note]);
    }
    
    // If no specific suggestions, provide the full range
    if (suggestions.length === 0) {
      suggestions.push(...SUPPORTED_NOTES);
    }
    
    return suggestions;
  }
}

/**
 * Default singleton instance of the fingering engine
 */
export const fingeringEngine = new FingeringEngine();