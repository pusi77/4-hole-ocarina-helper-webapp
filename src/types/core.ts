/**
 * Core type definitions for the Ocarina Fingering Chart Web Application
 */

/**
 * Represents a song with title and note sequences
 */
export interface Song {
  title: string;
  lines: string[][];
  metadata?: {
    originalInput: string;
    parseTimestamp: Date;
    noteCount: number;
  };
}

/**
 * Represents a fingering pattern for a specific note
 * Holes array represents: [top-left, top-right, bottom-left, bottom-right]
 * true = covered, false = open
 */
export interface FingeringPattern {
  note: string;
  holes: [boolean, boolean, boolean, boolean];
}

/**
 * Configuration for chart rendering
 */
export interface ChartConfig {
  canvasWidth: number;
  canvasHeight: number;
  holeRadius: number;
  spacing: number;
  colors: {
    background: string;
    holeFilled: string;
    holeEmpty: string;
    text: string;
  };
}

/**
 * Layout information for chart rendering
 */
export interface LayoutInfo {
  totalWidth: number;
  totalHeight: number;
  lineHeight: number;
  patternWidth: number;
  patternHeight: number;
  margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}