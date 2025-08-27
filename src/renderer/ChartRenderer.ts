/**
 * ChartRenderer - Canvas-based chart rendering for ocarina fingering patterns
 * Handles drawing, layout calculation, high-DPI support, and export functionality
 */

import type { Song, FingeringPattern, ChartConfig, LayoutInfo } from '../types/index.js';

export class ChartRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private config: ChartConfig;
  private dpr: number;

  constructor(canvas: HTMLCanvasElement, config: ChartConfig) {
    this.canvas = canvas;
    this.config = config;
    this.dpr = window.devicePixelRatio || 1;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D rendering context from canvas');
    }
    this.ctx = ctx;
    
    this.setupHighDPICanvas();
  }

  /**
   * Set up canvas for high-DPI displays with proper scaling
   */
  private setupHighDPICanvas(): void {
    const displayWidth = this.config.canvasWidth;
    const displayHeight = this.config.canvasHeight;
    
    // Set actual canvas size in memory (scaled up for high-DPI)
    this.canvas.width = displayWidth * this.dpr;
    this.canvas.height = displayHeight * this.dpr;
    
    // Set display size (CSS pixels)
    this.canvas.style.width = `${displayWidth}px`;
    this.canvas.style.height = `${displayHeight}px`;
    
    // Scale the drawing context so everything draws at the correct size
    this.ctx.scale(this.dpr, this.dpr);
  }

  /**
   * Calculate optimal layout for the given song
   */
  calculateLayout(song: Song): LayoutInfo {
    const { spacing, holeRadius } = this.config;
    
    // Calculate pattern dimensions
    const patternWidth = (holeRadius * 2 * 2) + spacing; // 2 holes wide (diameter each) + spacing between
    const patternHeight = (holeRadius * 2 * 2) + spacing; // 2 holes tall (diameter each) + spacing between
    
    // Handle empty song case
    const maxNotesPerLine = song.lines.length > 0 
      ? Math.max(...song.lines.map(line => line.length))
      : 1; // Minimum 1 to avoid -Infinity
    
    // Calculate line dimensions
    const lineWidth = maxNotesPerLine * (patternWidth + spacing * 2);
    const lineHeight = patternHeight + spacing * 3; // Extra space for note labels
    
    // Calculate total dimensions
    const margins = {
      top: spacing * 2,
      right: spacing * 2,
      bottom: spacing * 2,
      left: spacing * 2
    };
    
    const totalWidth = lineWidth + margins.left + margins.right;
    const totalHeight = Math.max(song.lines.length, 1) * lineHeight + margins.top + margins.bottom + spacing * 2; // Extra space for title
    
    return {
      totalWidth,
      totalHeight,
      lineHeight,
      patternWidth,
      patternHeight,
      margins
    };
  }

  /**
   * Update canvas size based on layout requirements
   */
  updateCanvasSize(layout: LayoutInfo): void {
    this.config.canvasWidth = layout.totalWidth;
    this.config.canvasHeight = layout.totalHeight;
    this.setupHighDPICanvas();
  }

  /**
   * Render the complete chart for a song
   */
  renderChart(song: Song, fingeringPatterns: Map<string, FingeringPattern>): void {
    const layout = this.calculateLayout(song);
    this.updateCanvasSize(layout);
    
    // Clear canvas
    this.ctx.fillStyle = this.config.colors.background;
    this.ctx.fillRect(0, 0, this.config.canvasWidth, this.config.canvasHeight);
    
    // Render title
    this.renderTitle(song.title, layout);
    
    // Render each line of notes
    song.lines.forEach((line, lineIndex) => {
      this.renderLine(line, lineIndex, layout, fingeringPatterns);
    });
  }

  /**
   * Render the song title
   */
  private renderTitle(title: string, layout: LayoutInfo): void {
    this.ctx.fillStyle = this.config.colors.text;
    this.ctx.font = `bold ${this.config.spacing}px Arial, sans-serif`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'top';
    
    const x = this.config.canvasWidth / 2;
    const y = layout.margins.top / 2;
    
    this.ctx.fillText(title, x, y);
  }

  /**
   * Render a line of notes
   */
  private renderLine(
    notes: string[], 
    lineIndex: number, 
    layout: LayoutInfo, 
    fingeringPatterns: Map<string, FingeringPattern>
  ): void {
    const startY = layout.margins.top + this.config.spacing * 2 + (lineIndex * layout.lineHeight);
    
    notes.forEach((note, noteIndex) => {
      const pattern = fingeringPatterns.get(note);
      if (pattern) {
        const x = layout.margins.left + (noteIndex * (layout.patternWidth + this.config.spacing * 2));
        this.renderFingeringPattern(pattern, x, startY);
      }
    });
  }

  /**
   * Render a single fingering pattern
   */
  renderFingeringPattern(pattern: FingeringPattern, x: number, y: number): void {
    const { holeRadius, spacing } = this.config;
    
    // Draw note label
    this.ctx.fillStyle = this.config.colors.text;
    this.ctx.font = `${spacing}px Arial, sans-serif`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'top';
    this.ctx.fillText(pattern.note, x + holeRadius * 2, y);
    
    // Draw holes in 2x2 grid
    const holePositions = [
      { x: x, y: y + spacing * 1.5 }, // top-left
      { x: x + holeRadius * 2 + spacing, y: y + spacing * 1.5 }, // top-right
      { x: x, y: y + spacing * 1.5 + holeRadius * 2 + spacing }, // bottom-left
      { x: x + holeRadius * 2 + spacing, y: y + spacing * 1.5 + holeRadius * 2 + spacing } // bottom-right
    ];
    
    pattern.holes.forEach((isCovered, index) => {
      const pos = holePositions[index];
      this.drawHole(pos.x + holeRadius, pos.y + holeRadius, isCovered);
    });
  }

  /**
   * Draw a single ocarina hole
   */
  private drawHole(centerX: number, centerY: number, isCovered: boolean): void {
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, this.config.holeRadius, 0, 2 * Math.PI);
    
    if (isCovered) {
      this.ctx.fillStyle = this.config.colors.holeFilled;
      this.ctx.fill();
    } else {
      this.ctx.fillStyle = this.config.colors.holeEmpty;
      this.ctx.fill();
      this.ctx.strokeStyle = this.config.colors.holeFilled;
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
    }
  }

  /**
   * Generate a meaningful filename based on song title
   */
  private generateFilename(songTitle: string): string {
    // Clean the song title for use as filename
    const cleanTitle = songTitle
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove special characters except spaces and hyphens
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
      .toLowerCase()
      .substring(0, 50); // Limit length to 50 characters
    
    // Add timestamp to ensure uniqueness
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '').toLowerCase();
    
    // Return formatted filename
    return cleanTitle ? `${cleanTitle}-${timestamp}.png` : `ocarina-chart-${timestamp}.png`;
  }

  /**
   * Export the current chart as PNG with high quality settings
   */
  exportToPNG(songTitle?: string, customFilename?: string): void {
    // Generate filename
    const filename = customFilename || this.generateFilename(songTitle || 'Untitled Song');
    
    // Create high-quality PNG export
    const dataURL = this.canvas.toDataURL('image/png', 1.0); // Maximum quality
    
    // Create download link
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataURL;
    
    // Add accessibility attributes
    link.setAttribute('aria-label', `Download ${songTitle || 'chart'} as PNG image`);
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Get the canvas data URL for external use
   */
  getDataURL(type: string = 'image/png', quality?: number): string {
    return this.canvas.toDataURL(type, quality);
  }

  /**
   * Get high-quality export data URL suitable for printing
   */
  getHighQualityDataURL(): string {
    return this.canvas.toDataURL('image/png', 1.0);
  }

  /**
   * Export chart data as blob for programmatic use
   */
  async exportAsBlob(type: string = 'image/png', quality?: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
      this.canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create blob from canvas'));
        }
      }, type, quality);
    });
  }

  /**
   * Check if the canvas has content to export
   */
  hasContent(): boolean {
    // Get image data and check if it's not just a blank canvas
    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const data = imageData.data;
    
    // Check if any pixel is not the background color
    // This is a simple check - in a more complex scenario, we might want to be more sophisticated
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      
      // If we find any non-transparent pixel that's not the background color, we have content
      if (a > 0) {
        // Convert background color to RGB for comparison
        const bgColor = this.hexToRgb(this.config.colors.background);
        if (bgColor && (r !== bgColor.r || g !== bgColor.g || b !== bgColor.b)) {
          return true;
        }
      }
    }
    
    return false;
  }

  /**
   * Helper method to convert hex color to RGB
   */
  private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  /**
   * Update the chart configuration
   */
  updateConfig(newConfig: Partial<ChartConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.setupHighDPICanvas();
  }

  /**
   * Clear the canvas
   */
  clear(): void {
    this.ctx.fillStyle = this.config.colors.background;
    this.ctx.fillRect(0, 0, this.config.canvasWidth, this.config.canvasHeight);
  }

  /**
   * Get current canvas dimensions
   */
  getDimensions(): { width: number; height: number } {
    return {
      width: this.config.canvasWidth,
      height: this.config.canvasHeight
    };
  }
}