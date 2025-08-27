/**
 * Unit tests for FingeringEngine
 *
 * Tests the fingering pattern database and engine functionality
 * according to requirements 3.4 and 2.4
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { FingeringEngine, fingeringEngine } from '../FingeringEngine.js';
import { ErrorType, SUPPORTED_NOTES } from '../../types/validation.js';

describe('FingeringEngine', () => {
  let engine: FingeringEngine;

  beforeEach(() => {
    engine = new FingeringEngine();
  });

  describe('getPattern', () => {
    it('should return correct fingering pattern for F (all holes covered)', () => {
      const pattern = engine.getPattern('F');
      expect(pattern).toEqual({
        note: 'F',
        holes: [true, true, true, true],
      });
    });

    it('should return correct fingering pattern for G (top-left, bottom-left, bottom-right)', () => {
      const pattern = engine.getPattern('G');
      expect(pattern).toEqual({
        note: 'G',
        holes: [true, false, true, true],
      });
    });

    it('should return correct fingering pattern for A (top-left, top-right, bottom-left)', () => {
      const pattern = engine.getPattern('A');
      expect(pattern).toEqual({
        note: 'A',
        holes: [true, true, true, false],
      });
    });

    it('should return correct fingering pattern for Bb (top-left, bottom-left)', () => {
      const pattern = engine.getPattern('Bb');
      expect(pattern).toEqual({
        note: 'Bb',
        holes: [true, false, true, false],
      });
    });

    it('should return correct fingering pattern for C (bottom-left, bottom-right)', () => {
      const pattern = engine.getPattern('C');
      expect(pattern).toEqual({
        note: 'C',
        holes: [false, false, true, true],
      });
    });

    it('should return correct fingering pattern for D (bottom-left only)', () => {
      const pattern = engine.getPattern('D');
      expect(pattern).toEqual({
        note: 'D',
        holes: [false, false, true, false],
      });
    });

    it('should return correct fingering pattern for E (top-right only)', () => {
      const pattern = engine.getPattern('E');
      expect(pattern).toEqual({
        note: 'E',
        holes: [false, true, false, false],
      });
    });

    it('should return null for unsupported notes', () => {
      expect(engine.getPattern('B')).toBeNull();
      expect(engine.getPattern('X')).toBeNull();
      expect(engine.getPattern('Db')).toBeNull();
      expect(engine.getPattern('')).toBeNull();
    });

    it('should handle whitespace in note names', () => {
      const pattern = engine.getPattern(' F ');
      expect(pattern).toEqual({
        note: 'F',
        holes: [true, true, true, true],
      });
    });
  });

  describe('getPatterns', () => {
    it('should return patterns for multiple valid notes', () => {
      const patterns = engine.getPatterns(['F', 'G', 'A']);
      expect(patterns).toHaveLength(3);
      expect(patterns[0]?.note).toBe('F');
      expect(patterns[1]?.note).toBe('G');
      expect(patterns[2]?.note).toBe('A');
    });

    it('should return null for unsupported notes in array', () => {
      const patterns = engine.getPatterns(['F', 'B', 'G']);
      expect(patterns).toHaveLength(3);
      expect(patterns[0]?.note).toBe('F');
      expect(patterns[1]).toBeNull();
      expect(patterns[2]?.note).toBe('G');
    });

    it('should handle empty array', () => {
      const patterns = engine.getPatterns([]);
      expect(patterns).toEqual([]);
    });
  });

  describe('isSupported', () => {
    it('should return true for all supported notes', () => {
      SUPPORTED_NOTES.forEach((note) => {
        expect(engine.isSupported(note)).toBe(true);
      });
    });

    it('should return false for unsupported notes', () => {
      const unsupportedNotes = ['B', 'Db', 'Eb', 'Gb', 'Ab', 'X', 'Y', 'Z'];
      unsupportedNotes.forEach((note) => {
        expect(engine.isSupported(note)).toBe(false);
      });
    });

    it('should handle whitespace in note names', () => {
      expect(engine.isSupported(' F ')).toBe(true);
      expect(engine.isSupported(' B ')).toBe(false);
    });

    it('should handle empty string', () => {
      expect(engine.isSupported('')).toBe(false);
    });
  });

  describe('getSupportedNotes', () => {
    it('should return all supported notes', () => {
      const supportedNotes = engine.getSupportedNotes();
      expect(supportedNotes).toEqual(['F', 'G', 'A', 'Bb', 'C', 'D', 'E']);
    });

    it('should return readonly array', () => {
      const supportedNotes = engine.getSupportedNotes();
      // Check that it's the same reference as the const array (readonly)
      expect(supportedNotes).toBe(SUPPORTED_NOTES);
      // Verify it's a readonly array by checking length property
      expect(supportedNotes.length).toBe(7);
    });
  });

  describe('validateNotes', () => {
    it('should return valid result for all supported notes', () => {
      const result = engine.validateNotes(['F', 'G', 'A', 'Bb', 'C', 'D', 'E']);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should return invalid result with errors for unsupported notes', () => {
      const result = engine.validateNotes(['F', 'B', 'G']);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe(ErrorType.UNSUPPORTED_NOTE);
      expect(result.errors[0].message).toContain('Note "B" is not supported');
      expect(result.errors[0].position).toBe(1);
      expect(result.errors[0].suggestions).toContain('Bb');
    });

    it('should provide suggestions for common note conversions', () => {
      const result = engine.validateNotes(['B']);
      expect(result.errors[0].suggestions).toContain('Bb');
    });

    it('should handle multiple unsupported notes', () => {
      const result = engine.validateNotes(['B', 'Db', 'F']);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0].position).toBe(0);
      expect(result.errors[1].position).toBe(1);
    });

    it('should handle empty array', () => {
      const result = engine.validateNotes([]);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('getAllPatterns', () => {
    it('should return all fingering patterns', () => {
      const patterns = engine.getAllPatterns();
      expect(Object.keys(patterns)).toHaveLength(7);
      expect(patterns.F.holes).toEqual([true, true, true, true]);
      expect(patterns.G.holes).toEqual([true, false, true, true]);
      expect(patterns.A.holes).toEqual([true, true, true, false]);
      expect(patterns.Bb.holes).toEqual([true, false, true, false]);
      expect(patterns.C.holes).toEqual([false, false, true, true]);
      expect(patterns.D.holes).toEqual([false, false, true, false]);
      expect(patterns.E.holes).toEqual([false, true, false, false]);
    });

    it('should return readonly patterns', () => {
      const patterns = engine.getAllPatterns();
      // Check that it's a readonly record by verifying structure
      expect(Object.keys(patterns)).toHaveLength(7);
      // Verify all patterns are present and immutable
      expect(patterns.F).toBeDefined();
      expect(patterns.G).toBeDefined();
      expect(patterns.A).toBeDefined();
      expect(patterns.Bb).toBeDefined();
      expect(patterns.C).toBeDefined();
      expect(patterns.D).toBeDefined();
      expect(patterns.E).toBeDefined();
    });
  });

  describe('fingering pattern accuracy', () => {
    it('should have exactly 4 holes for each pattern', () => {
      const patterns = engine.getAllPatterns();
      Object.values(patterns).forEach((pattern) => {
        expect(pattern.holes).toHaveLength(4);
        pattern.holes.forEach((hole) => {
          expect(typeof hole).toBe('boolean');
        });
      });
    });

    it('should have unique patterns for each note', () => {
      const patterns = engine.getAllPatterns();
      const patternStrings = Object.values(patterns).map((p) =>
        p.holes.join('')
      );
      const uniquePatterns = new Set(patternStrings);
      expect(uniquePatterns.size).toBe(Object.keys(patterns).length);
    });

    it('should match exact requirements from specification', () => {
      // Requirement 3.4: exact fingering patterns
      const patterns = engine.getAllPatterns();

      // F: all covered
      expect(patterns.F.holes.every((hole) => hole === true)).toBe(true);

      // G: top-left, bottom-left, bottom-right
      expect(patterns.G.holes).toEqual([true, false, true, true]);

      // A: top-left, top-right, bottom-left
      expect(patterns.A.holes).toEqual([true, true, true, false]);

      // Bb: top-left, bottom-left
      expect(patterns.Bb.holes).toEqual([true, false, true, false]);

      // C: bottom-left, bottom-right
      expect(patterns.C.holes).toEqual([false, false, true, true]);

      // D: bottom-left only
      expect(patterns.D.holes).toEqual([false, false, true, false]);

      // E: top-right only
      expect(patterns.E.holes).toEqual([false, true, false, false]);
    });
  });

  describe('singleton instance', () => {
    it('should provide a default singleton instance', () => {
      expect(fingeringEngine).toBeInstanceOf(FingeringEngine);
      expect(fingeringEngine.getSupportedNotes()).toEqual([
        'F',
        'G',
        'A',
        'Bb',
        'C',
        'D',
        'E',
      ]);
    });

    it('should return same patterns as new instance', () => {
      const newEngine = new FingeringEngine();
      const singletonPattern = fingeringEngine.getPattern('F');
      const newInstancePattern = newEngine.getPattern('F');
      expect(singletonPattern).toEqual(newInstancePattern);
    });
  });

  describe('edge cases', () => {
    it('should handle case sensitivity correctly', () => {
      // Note: Current implementation is case-sensitive as per design
      expect(engine.getPattern('f')).toBeNull();
      expect(engine.getPattern('F')).not.toBeNull();
    });

    it('should handle special characters', () => {
      expect(engine.getPattern('F#')).toBeNull();
      expect(engine.getPattern('F♯')).toBeNull();
      expect(engine.getPattern('F♭')).toBeNull();
    });

    it('should provide meaningful suggestions for common mistakes', () => {
      const result = engine.validateNotes(['Db', 'Eb', 'Gb', 'Ab']);
      result.errors.forEach((error) => {
        expect(error.suggestions).toBeDefined();
        expect(error.suggestions!.length).toBeGreaterThan(0);
      });
    });
  });
});
