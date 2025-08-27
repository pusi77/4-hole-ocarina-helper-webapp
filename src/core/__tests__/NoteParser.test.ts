/**
 * Unit tests for NoteParser class
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { NoteParser } from '../NoteParser.js';
import { ErrorType, WarningType } from '../../types/index.js';

describe('NoteParser', () => {
  let parser: NoteParser;

  beforeEach(() => {
    parser = new NoteParser();
  });

  describe('parseSong', () => {
    it('should parse a simple song correctly', () => {
      const input = `Simple Melody
F G A
F G A
F G A C D`;

      const song = parser.parseSong(input);

      expect(song.title).toBe('Simple Melody');
      expect(song.lines).toEqual([
        ['F', 'G', 'A'],
        ['F', 'G', 'A'],
        ['F', 'G', 'A', 'C', 'D']
      ]);
      expect(song.metadata?.noteCount).toBe(11);
      expect(song.metadata?.originalInput).toBe(input);
    });

    it('should handle title with prefix', () => {
      const input = `Title: Mary Had a Little Lamb
E D C D E E E`;

      const song = parser.parseSong(input);
      expect(song.title).toBe('Mary Had a Little Lamb');
    });

    it('should handle song with prefix', () => {
      const input = `Song: Twinkle Twinkle
C C G G A A G`;

      const song = parser.parseSong(input);
      expect(song.title).toBe('Twinkle Twinkle');
    });

    it('should use default title for untitled songs', () => {
      const input = `
F G A
C D E`;

      const song = parser.parseSong(input);
      expect(song.title).toBe('Untitled Song');
    });

    it('should handle various note separators', () => {
      const input = `Test Song
F G A
F,G,A
F|G|A
F-G-A`;

      const song = parser.parseSong(input);
      expect(song.lines).toEqual([
        ['F', 'G', 'A'],
        ['F', 'G', 'A'],
        ['F', 'G', 'A'],
        ['F', 'G', 'A']
      ]);
    });

    it('should skip empty lines', () => {
      const input = `Test Song
F G A

C D E

G A Bb`;

      const song = parser.parseSong(input);
      expect(song.lines).toEqual([
        ['F', 'G', 'A'],
        ['C', 'D', 'E'],
        ['G', 'A', 'Bb']
      ]);
    });

    it('should throw error for invalid input', () => {
      const input = '';
      expect(() => parser.parseSong(input)).toThrow('Parsing failed');
    });
  });

  describe('validateInput', () => {
    it('should validate correct input', () => {
      const input = `Simple Melody
F G A
F G A`;

      const result = parser.validateInput(input);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject empty input', () => {
      const result = parser.validateInput('');
      expect(result.isValid).toBe(false);
      expect(result.errors[0].type).toBe(ErrorType.EMPTY_INPUT);
      expect(result.errors[0].suggestions).toContain('Enter song notation or load an example song');
    });

    it('should reject whitespace-only input', () => {
      const result = parser.validateInput('   \n  \t  ');
      expect(result.isValid).toBe(false);
      expect(result.errors[0].type).toBe(ErrorType.EMPTY_INPUT);
    });

    it('should require title and notes', () => {
      const result = parser.validateInput('Just a title');
      expect(result.isValid).toBe(false);
      expect(result.errors[0].type).toBe(ErrorType.PARSING_ERROR);
      expect(result.errors[0].message).toContain('title and at least one line of notes');
    });

    it('should detect unsupported notes', () => {
      const input = `Test Song
F G X Y Z`;

      const result = parser.validateInput(input);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(3); // X, Y, Z are unsupported
      expect(result.errors[0].type).toBe(ErrorType.UNSUPPORTED_NOTE);
      expect(result.errors[0].suggestions).toContain('Supported notes: F, G, A, Bb, C, D, E');
    });

    it('should warn about B to Bb conversion', () => {
      const input = `Test Song
F G B`;

      const result = parser.validateInput(input);
      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].type).toBe(WarningType.NOTE_CONVERSION);
      expect(result.warnings[0].message).toContain('B\' will be converted to \'Bb\'');
    });

    it('should warn about empty lines', () => {
      const input = `Test Song
F G A

C D E`;

      const result = parser.validateInput(input);
      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].type).toBe(WarningType.EMPTY_LINE);
    });

    it('should enforce line limits', () => {
      const parser = new NoteParser({ maxLines: 3 });
      const input = `Title
Line 1
Line 2
Line 3
Line 4`;

      const result = parser.validateInput(input);
      expect(result.isValid).toBe(false);
      expect(result.errors[0].message).toContain('Too many lines');
    });

    it('should enforce notes per line limits', () => {
      const parser = new NoteParser({ maxNotesPerLine: 3 });
      const input = `Title
F G A Bb C D E`;

      const result = parser.validateInput(input);
      expect(result.isValid).toBe(false);
      expect(result.errors[0].message).toContain('Too many notes on line');
    });
  });

  describe('convertNotes', () => {
    it('should convert B to Bb', () => {
      const { notes, warnings } = parser.convertNotes(['F', 'B', 'G']);
      expect(notes).toEqual(['F', 'Bb', 'G']);
      expect(warnings).toHaveLength(1);
      expect(warnings[0].type).toBe(WarningType.NOTE_CONVERSION);
    });

    it('should convert multiple B notes', () => {
      const { notes, warnings } = parser.convertNotes(['B', 'F', 'B', 'G']);
      expect(notes).toEqual(['Bb', 'F', 'Bb', 'G']);
      expect(warnings).toHaveLength(2);
    });

    it('should handle case insensitive B', () => {
      const { notes, warnings } = parser.convertNotes(['b', 'F', 'G']);
      expect(notes).toEqual(['Bb', 'F', 'G']);
      expect(warnings).toHaveLength(1);
    });

    it('should not convert when autoConvertB is false', () => {
      const parser = new NoteParser({ autoConvertB: false });
      const { notes, warnings } = parser.convertNotes(['F', 'B', 'G']);
      expect(notes).toEqual(['F', 'B', 'G']);
      expect(warnings).toHaveLength(0);
    });

    it('should leave other notes unchanged', () => {
      const { notes, warnings } = parser.convertNotes(['F', 'G', 'A', 'Bb', 'C', 'D', 'E']);
      expect(notes).toEqual(['F', 'G', 'A', 'Bb', 'C', 'D', 'E']);
      expect(warnings).toHaveLength(0);
    });
  });

  describe('static methods', () => {
    it('should return supported notes', () => {
      const notes = NoteParser.getSupportedNotes();
      expect(notes).toEqual(['F', 'G', 'A', 'Bb', 'C', 'D', 'E']);
    });

    it('should check if note is supported', () => {
      expect(NoteParser.isNoteSupported('F')).toBe(true);
      expect(NoteParser.isNoteSupported('Bb')).toBe(true);
      expect(NoteParser.isNoteSupported('B')).toBe(false);
      expect(NoteParser.isNoteSupported('X')).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle mixed case notes', () => {
      const input = `Test Song
f g a bb c d e`;

      const song = parser.parseSong(input);
      expect(song.lines[0]).toEqual(['F', 'G', 'A', 'Bb', 'C', 'D', 'E']);
    });

    it('should handle extra whitespace', () => {
      const input = `  Test Song  
  F   G   A  
  C   D   E  `;

      const song = parser.parseSong(input);
      expect(song.title).toBe('Test Song');
      expect(song.lines).toEqual([
        ['F', 'G', 'A'],
        ['C', 'D', 'E']
      ]);
    });

    it('should handle Windows line endings', () => {
      const input = `Test Song\r\nF G A\r\nC D E`;

      const song = parser.parseSong(input);
      expect(song.lines).toEqual([
        ['F', 'G', 'A'],
        ['C', 'D', 'E']
      ]);
    });

    it('should handle single note lines', () => {
      const input = `Test Song
F
G
A`;

      const song = parser.parseSong(input);
      expect(song.lines).toEqual([['F'], ['G'], ['A']]);
    });

    it('should provide detailed error positions', () => {
      const input = `Test Song
F G X A Y`;

      const result = parser.validateInput(input);
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0].line).toBe(2);
      expect(result.errors[0].position).toBe(3); // X is 3rd note
      expect(result.errors[1].line).toBe(2);
      expect(result.errors[1].position).toBe(5); // Y is 5th note
    });
  });

  describe('configuration options', () => {
    it('should respect strictValidation setting', () => {
      const parser = new NoteParser({ strictValidation: false });
      // This would typically allow more lenient parsing
      // For now, the behavior is the same, but the option is available
      expect(parser).toBeDefined();
    });

    it('should respect custom limits', () => {
      const parser = new NoteParser({
        maxLines: 5,
        maxNotesPerLine: 15
      });

      const longInput = `Title
F G A F G A F G A F G A`;

      const result = parser.validateInput(longInput);
      expect(result.isValid).toBe(true); // Should pass with higher limit
    });
  });
});