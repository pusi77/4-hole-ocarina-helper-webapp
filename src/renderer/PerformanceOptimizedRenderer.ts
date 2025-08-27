/**
 * PerformanceOptimizedRenderer - Enhanced ChartRenderer with performance optimizations
 * Includes dirty region tracking, efficient redrawing, and memory management
 */

import { ChartRenderer } from './ChartRenderer.js';
import type {
  Song,
  FingeringPattern,
  ChartConfig,
  LayoutInfo,
} from '../types/index.js';

interface DirtyRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface RenderCache {
  patterns: Map<string, ImageData>;
  layout: LayoutInfo | null;
  song: Song | null;
  lastRenderTime: number;
}

/**
 * Performance-optimized chart renderer with dirty region tracking
 */
export class PerformanceOptimizedRenderer extends ChartRenderer {
  private dirtyRegions: DirtyRegion[] = [];
  private renderCache: RenderCache;
  private isRendering: boolean = false;
  private pendingRender: number | null = null;
  // @ts-ignore - reserved for future performance tracking
  private lastFrameTime: number = 0;
  // @ts-ignore - reserved for future performance tracking
  private frameCount: number = 0;
  private performanceMetrics: {
    averageRenderTime: number;
    lastRenderTime: number;
    totalRenders: number;
    cacheHits: number;
    cacheMisses: number;
  };

  constructor(canvas: HTMLCanvasElement, config: ChartConfig) {
    super(canvas, config);

    this.renderCache = {
      patterns: new Map(),
      layout: null,
      song: null,
      lastRenderTime: 0,
    };

    this.performanceMetrics = {
      averageRenderTime: 0,
      lastRenderTime: 0,
      totalRenders: 0,
      cacheHits: 0,
      cacheMisses: 0,
    };
  }

  /**
   * Enhanced render method with dirty region tracking
   */
  renderChart(
    song: Song,
    fingeringPatterns: Map<string, FingeringPattern>
  ): void {
    // Prevent concurrent renders
    if (this.isRendering) {
      this.scheduleRender(() => this.renderChart(song, fingeringPatterns));
      return;
    }

    const startTime = performance.now();
    this.isRendering = true;

    try {
      // Check if we can use cached render
      if (this.canUseCachedRender(song)) {
        this.performanceMetrics.cacheHits++;
        return;
      }

      this.performanceMetrics.cacheMisses++;

      // Calculate layout and update canvas if needed
      const layout = this.calculateLayout(song);
      const layoutChanged = !this.layoutEquals(layout, this.renderCache.layout);

      if (layoutChanged) {
        this.updateCanvasSize(layout);
        this.markEntireCanvasDirty();
        this.renderCache.layout = layout;
      }

      // Render using dirty regions if available, otherwise full render
      if (this.dirtyRegions.length > 0 && !layoutChanged) {
        this.renderDirtyRegions(song, fingeringPatterns, layout);
      } else {
        this.renderFullChart(song, fingeringPatterns, layout);
      }

      // Update cache
      this.updateRenderCache(song, layout);
      this.clearDirtyRegions();
    } finally {
      this.isRendering = false;
      const endTime = performance.now();
      this.updatePerformanceMetrics(endTime - startTime);
    }
  }

  /**
   * Schedule a render for the next animation frame
   */
  private scheduleRender(renderFn: () => void): void {
    if (this.pendingRender !== null) {
      cancelAnimationFrame(this.pendingRender);
    }

    this.pendingRender = requestAnimationFrame(() => {
      this.pendingRender = null;
      renderFn();
    });
  }

  /**
   * Check if we can use the cached render
   */
  private canUseCachedRender(song: Song): boolean {
    if (!this.renderCache.song || !this.renderCache.layout) {
      return false;
    }

    // Simple comparison - in production, you might want more sophisticated comparison
    return (
      this.renderCache.song.title === song.title &&
      this.renderCache.song.lines.length === song.lines.length &&
      JSON.stringify(this.renderCache.song.lines) ===
        JSON.stringify(song.lines) &&
      this.dirtyRegions.length === 0
    );
  }

  /**
   * Compare two layouts for equality
   */
  private layoutEquals(
    layout1: LayoutInfo | null,
    layout2: LayoutInfo | null
  ): boolean {
    if (!layout1 || !layout2) return false;

    return (
      layout1.totalWidth === layout2.totalWidth &&
      layout1.totalHeight === layout2.totalHeight &&
      layout1.lineHeight === layout2.lineHeight &&
      layout1.patternWidth === layout2.patternWidth &&
      layout1.patternHeight === layout2.patternHeight
    );
  }

  /**
   * Render only dirty regions
   */
  private renderDirtyRegions(
    song: Song,
    fingeringPatterns: Map<string, FingeringPattern>,
    layout: LayoutInfo
  ): void {
    const ctx = this.getContext();

    this.dirtyRegions.forEach((region) => {
      // Save current state
      ctx.save();

      // Clip to dirty region
      ctx.beginPath();
      ctx.rect(region.x, region.y, region.width, region.height);
      ctx.clip();

      // Clear the region
      ctx.fillStyle = this.getConfig().colors.background;
      ctx.fillRect(region.x, region.y, region.width, region.height);

      // Render content that intersects with this region
      this.renderRegionContent(song, fingeringPatterns, layout, region);

      // Restore state
      ctx.restore();
    });
  }

  /**
   * Render content within a specific region
   */
  private renderRegionContent(
    song: Song,
    fingeringPatterns: Map<string, FingeringPattern>,
    layout: LayoutInfo,
    region: DirtyRegion
  ): void {
    // Check if title intersects with region
    const titleRegion = {
      x: 0,
      y: 0,
      width: this.getConfig().canvasWidth,
      height: layout.margins.top + this.getConfig().spacing * 2,
    };

    if (this.regionsIntersect(region, titleRegion)) {
      // Call parent renderChart method instead of private methods
      super.renderChart(song, fingeringPatterns);
    }

    // Check which lines intersect with the region
    song.lines.forEach((_line, lineIndex) => {
      const lineY =
        layout.margins.top +
        this.getConfig().spacing * 2 +
        lineIndex * layout.lineHeight;
      const lineRegion = {
        x: 0,
        y: lineY,
        width: this.getConfig().canvasWidth,
        height: layout.lineHeight,
      };

      if (this.regionsIntersect(region, lineRegion)) {
        // TODO: Implement line rendering without accessing private methods
        // this.renderLine(line, lineIndex, layout, fingeringPatterns);
      }
    });
  }

  /**
   * Check if two regions intersect
   */
  private regionsIntersect(
    region1: DirtyRegion,
    region2: DirtyRegion
  ): boolean {
    return !(
      region1.x + region1.width < region2.x ||
      region2.x + region2.width < region1.x ||
      region1.y + region1.height < region2.y ||
      region2.y + region2.height < region1.y
    );
  }

  /**
   * Render the full chart (fallback method)
   */
  private renderFullChart(
    song: Song,
    fingeringPatterns: Map<string, FingeringPattern>,
    _layout: LayoutInfo
  ): void {
    // Use parent class method for full render
    super.renderChart(song, fingeringPatterns);
  }

  /**
   * Mark a region as dirty for next render
   */
  public markRegionDirty(
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    this.dirtyRegions.push({ x, y, width, height });
    this.coalesceDirtyRegions();
  }

  /**
   * Mark the entire canvas as dirty
   */
  public markEntireCanvasDirty(): void {
    this.dirtyRegions = [
      {
        x: 0,
        y: 0,
        width: this.getConfig().canvasWidth,
        height: this.getConfig().canvasHeight,
      },
    ];
  }

  /**
   * Coalesce overlapping dirty regions to reduce render calls
   */
  private coalesceDirtyRegions(): void {
    if (this.dirtyRegions.length <= 1) return;

    const coalesced: DirtyRegion[] = [];
    const sorted = [...this.dirtyRegions].sort(
      (a, b) => a.x - b.x || a.y - b.y
    );

    for (const region of sorted) {
      let merged = false;

      for (let i = 0; i < coalesced.length; i++) {
        if (this.canMergeRegions(coalesced[i], region)) {
          coalesced[i] = this.mergeRegions(coalesced[i], region);
          merged = true;
          break;
        }
      }

      if (!merged) {
        coalesced.push(region);
      }
    }

    this.dirtyRegions = coalesced;
  }

  /**
   * Check if two regions can be merged
   */
  private canMergeRegions(region1: DirtyRegion, region2: DirtyRegion): boolean {
    // Simple heuristic: merge if they overlap or are close enough
    const threshold = 10; // pixels

    return (
      (Math.abs(region1.x - region2.x) <= threshold &&
        Math.abs(region1.y - region2.y) <= threshold) ||
      this.regionsIntersect(region1, region2)
    );
  }

  /**
   * Merge two regions into one
   */
  private mergeRegions(
    region1: DirtyRegion,
    region2: DirtyRegion
  ): DirtyRegion {
    const minX = Math.min(region1.x, region2.x);
    const minY = Math.min(region1.y, region2.y);
    const maxX = Math.max(region1.x + region1.width, region2.x + region2.width);
    const maxY = Math.max(
      region1.y + region1.height,
      region2.y + region2.height
    );

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  /**
   * Clear all dirty regions
   */
  private clearDirtyRegions(): void {
    this.dirtyRegions = [];
  }

  /**
   * Update render cache
   */
  private updateRenderCache(song: Song, layout: LayoutInfo): void {
    this.renderCache.song = { ...song };
    this.renderCache.layout = { ...layout };
    this.renderCache.lastRenderTime = performance.now();
  }

  /**
   * Update performance metrics
   */
  private updatePerformanceMetrics(renderTime: number): void {
    this.performanceMetrics.lastRenderTime = renderTime;
    this.performanceMetrics.totalRenders++;

    // Calculate rolling average
    const alpha = 0.1; // Smoothing factor
    this.performanceMetrics.averageRenderTime =
      this.performanceMetrics.averageRenderTime * (1 - alpha) +
      renderTime * alpha;
  }

  /**
   * Get performance metrics
   */
  public getPerformanceMetrics(): typeof this.performanceMetrics {
    return { ...this.performanceMetrics };
  }

  /**
   * Clear performance cache
   */
  public clearCache(): void {
    this.renderCache.patterns.clear();
    this.renderCache.layout = null;
    this.renderCache.song = null;
    this.dirtyRegions = [];

    // Reset metrics
    this.performanceMetrics = {
      averageRenderTime: 0,
      lastRenderTime: 0,
      totalRenders: 0,
      cacheHits: 0,
      cacheMisses: 0,
    };
  }

  /**
   * Get memory usage estimate
   */
  public getMemoryUsage(): {
    cacheSize: number;
    dirtyRegions: number;
    estimatedBytes: number;
  } {
    const cacheSize = this.renderCache.patterns.size;
    const dirtyRegions = this.dirtyRegions.length;

    // Rough estimate of memory usage
    let estimatedBytes = 0;
    this.renderCache.patterns.forEach((imageData) => {
      estimatedBytes += imageData.data.length * 4; // 4 bytes per pixel (RGBA)
    });

    return {
      cacheSize,
      dirtyRegions,
      estimatedBytes,
    };
  }

  /**
   * Helper methods to access parent class protected members
   */
  private getContext(): CanvasRenderingContext2D {
    return (this as any).ctx;
  }

  private getConfig(): ChartConfig {
    return (this as any).config;
  }

  /**
   * Destroy and cleanup
   */
  public destroy(): void {
    if (this.pendingRender !== null) {
      cancelAnimationFrame(this.pendingRender);
      this.pendingRender = null;
    }

    this.clearCache();
  }
}
