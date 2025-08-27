/**
 * PreviewController - Manages real-time chart preview updates
 * Connects text input to chart renderer for live preview functionality
 */

import type { Song, ChartConfig, FingeringPattern } from '../types/index.js';
import { ChartRenderer } from '../renderer/ChartRenderer.js';
import { FingeringEngine } from '../core/FingeringEngine.js';

/**
 * Configuration for preview behavior
 */
interface PreviewConfig {
  autoUpdate: boolean;
  showEmptyState: boolean;
  emptyStateMessage: string;
  errorStateMessage: string;
}

/**
 * Default preview configuration
 */
const DEFAULT_PREVIEW_CONFIG: PreviewConfig = {
  autoUpdate: true,
  showEmptyState: true,
  emptyStateMessage: 'Enter song notation to see the fingering chart preview',
  errorStateMessage: 'Fix the errors above to see the chart preview',
};

/**
 * Default chart configuration
 */
const DEFAULT_CHART_CONFIG: ChartConfig = {
  canvasWidth: 800,
  canvasHeight: 600,
  holeRadius: 15,
  spacing: 20,
  colors: {
    background: '#ffffff',
    holeFilled: '#333333',
    holeEmpty: '#ffffff',
    text: '#333333',
  },
};

/**
 * PreviewController manages the live chart preview functionality
 */
export class PreviewController {
  private canvas: HTMLCanvasElement;
  private renderer: ChartRenderer;
  private fingeringEngine: FingeringEngine;
  private config: PreviewConfig;
  private chartConfig: ChartConfig;
  private currentSong: Song | null = null;
  private emptyStateElement: HTMLElement | null = null;

  constructor(
    canvas: HTMLCanvasElement,
    config: Partial<PreviewConfig> = {},
    chartConfig: Partial<ChartConfig> = {}
  ) {
    this.canvas = canvas;
    this.config = { ...DEFAULT_PREVIEW_CONFIG, ...config };
    this.chartConfig = { ...DEFAULT_CHART_CONFIG, ...chartConfig };

    this.fingeringEngine = new FingeringEngine();
    this.renderer = new ChartRenderer(this.canvas, this.chartConfig);

    this.initialize();
  }

  /**
   * Initialize the preview controller
   */
  private initialize(): void {
    this.setupCanvas();
    this.createEmptyStateElement();
    this.showEmptyState();
  }

  /**
   * Set up canvas styling and container
   */
  private setupCanvas(): void {
    // Style the canvas
    this.canvas.style.border = '2px solid #ddd';
    this.canvas.style.borderRadius = '4px';
    this.canvas.style.backgroundColor = this.chartConfig.colors.background;
    this.canvas.style.display = 'block';
    this.canvas.style.maxWidth = '100%';
    this.canvas.style.height = 'auto';

    // Ensure canvas has proper dimensions
    this.canvas.width = this.chartConfig.canvasWidth;
    this.canvas.height = this.chartConfig.canvasHeight;
  }

  /**
   * Create empty state element
   */
  private createEmptyStateElement(): void {
    this.emptyStateElement = document.createElement('div');
    this.emptyStateElement.className = 'preview-empty-state';

    // Style the empty state
    this.emptyStateElement.style.position = 'absolute';
    this.emptyStateElement.style.top = '50%';
    this.emptyStateElement.style.left = '50%';
    this.emptyStateElement.style.transform = 'translate(-50%, -50%)';
    this.emptyStateElement.style.textAlign = 'center';
    this.emptyStateElement.style.color = '#666';
    this.emptyStateElement.style.fontSize = '16px';
    this.emptyStateElement.style.fontFamily = 'Arial, sans-serif';
    this.emptyStateElement.style.padding = '20px';
    this.emptyStateElement.style.maxWidth = '300px';
    this.emptyStateElement.style.lineHeight = '1.5';
    this.emptyStateElement.style.pointerEvents = 'none';

    // Position canvas container relatively if needed
    const canvasParent = this.canvas.parentElement;
    if (canvasParent) {
      if (getComputedStyle(canvasParent).position === 'static') {
        canvasParent.style.position = 'relative';
      }
      canvasParent.appendChild(this.emptyStateElement);
    }
  }

  /**
   * Update the chart preview with a new song
   */
  public updatePreview(song: Song): void {
    if (!this.config.autoUpdate) {
      return;
    }

    this.currentSong = song;
    this.hideEmptyState();

    try {
      // Get fingering patterns for all notes in the song
      const fingeringPatterns = new Map<string, FingeringPattern>();

      // Collect all unique notes from the song
      const allNotes = new Set<string>();
      song.lines.forEach((line) => {
        line.forEach((note) => allNotes.add(note));
      });

      // Get fingering patterns for each note
      allNotes.forEach((note) => {
        try {
          const pattern = this.fingeringEngine.getPattern(note);
          if (pattern) {
            fingeringPatterns.set(note, pattern);
          }
        } catch (error) {
          console.warn(
            `Could not get fingering pattern for note: ${note}`,
            error
          );
        }
      });

      // Render the chart
      this.renderer.renderChart(song, fingeringPatterns);

      // Show the canvas
      this.canvas.style.display = 'block';
    } catch (error) {
      console.error('Error updating chart preview:', error);
      this.showErrorState();
    }
  }

  /**
   * Clear the preview
   */
  public clearPreview(): void {
    this.currentSong = null;
    this.renderer.clear();
    this.showEmptyState();
  }

  /**
   * Show empty state message
   */
  private showEmptyState(): void {
    if (this.config.showEmptyState && this.emptyStateElement) {
      this.emptyStateElement.innerHTML = `
        <div style="margin-bottom: 12px; font-size: 24px;">🎵</div>
        <div>${this.config.emptyStateMessage}</div>
      `;
      this.emptyStateElement.style.display = 'block';
    }

    // Clear canvas but keep it visible for layout
    this.renderer.clear();
  }

  /**
   * Show error state message
   */
  private showErrorState(): void {
    if (this.emptyStateElement) {
      this.emptyStateElement.innerHTML = `
        <div style="margin-bottom: 12px; font-size: 24px;">❌</div>
        <div>${this.config.errorStateMessage}</div>
      `;
      this.emptyStateElement.style.display = 'block';
    }

    // Clear canvas
    this.renderer.clear();
  }

  /**
   * Hide empty state message
   */
  private hideEmptyState(): void {
    if (this.emptyStateElement) {
      this.emptyStateElement.style.display = 'none';
    }
  }

  /**
   * Handle validation errors
   */
  public handleValidationError(): void {
    this.showErrorState();
  }

  /**
   * Export current chart as PNG
   */
  public exportChart(filename?: string): void {
    if (!this.currentSong) {
      throw new Error('No chart to export');
    }

    // Check if renderer has content to export
    if (!this.renderer.hasContent()) {
      throw new Error('No chart content available to export');
    }

    // Use the renderer's enhanced export functionality
    this.renderer.exportToPNG(this.currentSong.title, filename);
  }

  /**
   * Get export data URL for external use
   */
  public getExportDataURL(): string {
    if (!this.currentSong || !this.renderer.hasContent()) {
      throw new Error('No chart content available to export');
    }

    return this.renderer.getHighQualityDataURL();
  }

  /**
   * Export chart as blob for programmatic use
   */
  public async exportAsBlob(): Promise<Blob> {
    if (!this.currentSong || !this.renderer.hasContent()) {
      throw new Error('No chart content available to export');
    }

    return this.renderer.exportAsBlob('image/png', 1.0);
  }

  /**
   * Get current song
   */
  public getCurrentSong(): Song | null {
    return this.currentSong;
  }

  /**
   * Check if preview has content
   */
  public hasContent(): boolean {
    return this.currentSong !== null && this.renderer.hasContent();
  }

  /**
   * Update chart configuration
   */
  public updateChartConfig(newConfig: Partial<ChartConfig>): void {
    this.chartConfig = { ...this.chartConfig, ...newConfig };
    this.renderer.updateConfig(this.chartConfig);

    // Re-render if we have a current song
    if (this.currentSong) {
      this.updatePreview(this.currentSong);
    }
  }

  /**
   * Update preview configuration
   */
  public updateConfig(newConfig: Partial<PreviewConfig>): void {
    this.config = { ...this.config, ...newConfig };

    // Update empty state message if changed
    if (newConfig.emptyStateMessage && !this.currentSong) {
      this.showEmptyState();
    }
  }

  /**
   * Resize canvas to fit container
   */
  public resize(): void {
    // Get container dimensions
    const container = this.canvas.parentElement;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const maxWidth = containerRect.width - 40; // Account for padding

    // Update chart config if needed
    if (maxWidth > 0 && maxWidth !== this.chartConfig.canvasWidth) {
      const aspectRatio =
        this.chartConfig.canvasHeight / this.chartConfig.canvasWidth;
      this.updateChartConfig({
        canvasWidth: maxWidth,
        canvasHeight: maxWidth * aspectRatio,
      });
    }
  }

  /**
   * Destroy the preview controller and clean up
   */
  public destroy(): void {
    // Remove empty state element
    if (this.emptyStateElement && this.emptyStateElement.parentElement) {
      this.emptyStateElement.parentElement.removeChild(this.emptyStateElement);
    }

    // Clear current song
    this.currentSong = null;
  }
}
