/**
 * Basic tests for ChartRenderer
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ChartRenderer } from '../ChartRenderer.js';
import type { Song, ChartConfig } from '../../types/index.js';

// Mock canvas and context
const mockContext = {
  scale: vi.fn(),
  fillRect: vi.fn(),
  fillText: vi.fn(),
  beginPath: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  stroke: vi.fn(),
  clearRect: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  fillStyle: '',
  strokeStyle: '',
  font: '',
  textAlign: '',
  textBaseline: '',
  lineWidth: 0,
} as unknown as CanvasRenderingContext2D;

const mockCanvas = {
  width: 800,
  height: 600,
  style: { width: '800px', height: '600px' },
  getContext: vi.fn(() => mockContext),
  toDataURL: vi.fn(() => 'data:image/png;base64,test'),
} as unknown as HTMLCanvasElement;

describe('ChartRenderer', () => {
  let renderer: ChartRenderer;
  let testSong: Song;
  let testConfig: ChartConfig;

  beforeEach(() => {
    vi.clearAllMocks();

    testSong = {
      title: 'Test Song',
      lines: [['F', 'G', 'A']],
      metadata: {
        noteCount: 3,
        originalInput: 'Test Song\nF G A',
        parseTimestamp: new Date(),
      },
    };

    testConfig = {
      canvasWidth: 800,
      canvasHeight: 600,
      holeRadius: 10,
      spacing: 20,
      colors: {
        background: '#ffffff',
        holeFilled: '#000000',
        holeEmpty: '#ffffff',
        text: '#000000',
      },
    };

    renderer = new ChartRenderer(mockCanvas, testConfig);
  });

  it('should create an instance', () => {
    expect(renderer).toBeInstanceOf(ChartRenderer);
  });

  it('should calculate layout', () => {
    const layout = renderer.calculateLayout(testSong);

    expect(layout).toHaveProperty('totalWidth');
    expect(layout).toHaveProperty('totalHeight');
    expect(layout.totalWidth).toBeGreaterThan(0);
    expect(layout.totalHeight).toBeGreaterThan(0);
  });

  it('should render to canvas', () => {
    const mockPatterns = new Map([
      [
        'F',
        {
          note: 'F',
          holes: [true, true, true, true] as [
            boolean,
            boolean,
            boolean,
            boolean,
          ],
        },
      ],
      [
        'G',
        {
          note: 'G',
          holes: [true, false, true, true] as [
            boolean,
            boolean,
            boolean,
            boolean,
          ],
        },
      ],
      [
        'A',
        {
          note: 'A',
          holes: [true, true, true, false] as [
            boolean,
            boolean,
            boolean,
            boolean,
          ],
        },
      ],
    ]);

    expect(() => renderer.renderChart(testSong, mockPatterns)).not.toThrow();

    // Just verify the method completed without error
    expect(renderer).toBeInstanceOf(ChartRenderer);
  });

  it('should export to PNG', () => {
    // This method doesn't return a data URL, it triggers a download
    expect(() => renderer.exportToPNG('Test Song')).not.toThrow();
  });

  it('should get data URL', () => {
    const dataUrl = renderer.getDataURL();

    expect(typeof dataUrl).toBe('string');
    expect(dataUrl).toContain('data:image/png;base64,');
  });

  it('should handle empty song', () => {
    const emptySong: Song = {
      title: 'Empty Song',
      lines: [],
      metadata: {
        noteCount: 0,
        originalInput: 'Empty Song',
        parseTimestamp: new Date(),
      },
    };

    const emptyPatterns = new Map();
    expect(() => renderer.renderChart(emptySong, emptyPatterns)).not.toThrow();
  });
});
