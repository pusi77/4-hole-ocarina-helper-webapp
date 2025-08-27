/**
 * Basic Test Suite - Core functionality tests
 */

import { describe, it, expect } from 'vitest';
import { NoteParser } from '../core/NoteParser.js';
import { FingeringEngine } from '../core/FingeringEngine.js';

describe('Core Functionality', () => {
  it('should verify core components can be instantiated', () => {
    const parser = new NoteParser();
    const engine = new FingeringEngine();

    expect(parser).toBeInstanceOf(NoteParser);
    expect(engine).toBeInstanceOf(FingeringEngine);

    // Test basic functionality
    expect(parser.validateInput).toBeDefined();
    expect(engine.getPattern).toBeDefined();
  });

  it('should handle basic note parsing', () => {
    const parser = new NoteParser();
    const song = parser.parseSong('Test Song\nF G A');

    expect(song.title).toBe('Test Song');
    expect(song.lines).toEqual([['F', 'G', 'A']]);
  });

  it('should get fingering patterns', () => {
    const engine = new FingeringEngine();
    const pattern = engine.getPattern('F');

    expect(pattern).toEqual({
      note: 'F',
      holes: [true, true, true, true],
    });
  });
});
