/**
 * MemoryMonitor - Monitor and manage memory usage for large songs
 * Provides memory tracking, cleanup, and optimization recommendations
 */

export interface MemoryUsage {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  usedPercentage: number;
  timestamp: number;
}

export interface MemoryThresholds {
  warning: number; // Percentage of heap limit
  critical: number; // Percentage of heap limit
  cleanup: number; // Percentage of heap limit to trigger cleanup
}

export interface MemoryMonitorEvents {
  onMemoryWarning?: (usage: MemoryUsage) => void;
  onMemoryCritical?: (usage: MemoryUsage) => void;
  onMemoryCleanup?: (usage: MemoryUsage) => void;
  onMemoryUpdate?: (usage: MemoryUsage) => void;
}

/**
 * Memory monitoring and management system
 */
export class MemoryMonitor {
  private events: MemoryMonitorEvents;
  private thresholds: MemoryThresholds;
  private monitoringInterval: ReturnType<typeof setInterval> | null = null;
  private isMonitoring: boolean = false;
  private memoryHistory: MemoryUsage[] = [];
  private maxHistorySize: number = 100;
  private cleanupCallbacks: (() => void)[] = [];

  constructor(
    events: MemoryMonitorEvents = {},
    thresholds: MemoryThresholds = {
      warning: 70,
      critical: 85,
      cleanup: 80,
    }
  ) {
    this.events = events;
    this.thresholds = thresholds;
  }

  /**
   * Start memory monitoring
   */
  startMonitoring(intervalMs: number = 5000): void {
    if (this.isMonitoring) {
      console.warn('MemoryMonitor: Already monitoring');
      return;
    }

    if (!this.isMemoryAPIAvailable()) {
      console.warn('MemoryMonitor: Memory API not available in this browser');
      return;
    }

    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.checkMemoryUsage();
    }, intervalMs);

    // Initial check
    this.checkMemoryUsage();
  }

  /**
   * Stop memory monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isMonitoring = false;
  }

  /**
   * Check if Memory API is available
   */
  private isMemoryAPIAvailable(): boolean {
    return !!(performance as any).memory;
  }

  /**
   * Get current memory usage
   */
  getCurrentMemoryUsage(): MemoryUsage | null {
    if (!this.isMemoryAPIAvailable()) {
      return null;
    }

    const memory = (performance as any).memory;
    const usedPercentage =
      (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;

    return {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      usedPercentage,
      timestamp: Date.now(),
    };
  }

  /**
   * Check memory usage and trigger events if thresholds are exceeded
   */
  private checkMemoryUsage(): void {
    const usage = this.getCurrentMemoryUsage();
    if (!usage) return;

    // Add to history
    this.memoryHistory.push(usage);
    if (this.memoryHistory.length > this.maxHistorySize) {
      this.memoryHistory.shift();
    }

    // Trigger events based on thresholds
    if (usage.usedPercentage >= this.thresholds.critical) {
      if (this.events.onMemoryCritical) {
        this.events.onMemoryCritical(usage);
      }
    } else if (usage.usedPercentage >= this.thresholds.warning) {
      if (this.events.onMemoryWarning) {
        this.events.onMemoryWarning(usage);
      }
    }

    // Trigger cleanup if needed
    if (usage.usedPercentage >= this.thresholds.cleanup) {
      this.triggerCleanup(usage);
    }

    // Always trigger update event
    if (this.events.onMemoryUpdate) {
      this.events.onMemoryUpdate(usage);
    }
  }

  /**
   * Trigger memory cleanup
   */
  private triggerCleanup(usage: MemoryUsage): void {
    console.log('MemoryMonitor: Triggering cleanup due to high memory usage');

    // Execute all registered cleanup callbacks
    this.cleanupCallbacks.forEach((callback) => {
      try {
        callback();
      } catch (error) {
        console.error('MemoryMonitor: Error in cleanup callback:', error);
      }
    });

    // Force garbage collection if available (Chrome DevTools)
    if ((window as any).gc) {
      (window as any).gc();
    }

    if (this.events.onMemoryCleanup) {
      this.events.onMemoryCleanup(usage);
    }
  }

  /**
   * Register a cleanup callback
   */
  registerCleanupCallback(callback: () => void): () => void {
    this.cleanupCallbacks.push(callback);

    // Return unregister function
    return () => {
      const index = this.cleanupCallbacks.indexOf(callback);
      if (index > -1) {
        this.cleanupCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Get memory usage history
   */
  getMemoryHistory(): MemoryUsage[] {
    return [...this.memoryHistory];
  }

  /**
   * Get memory usage statistics
   */
  getMemoryStats(): {
    current: MemoryUsage | null;
    average: number;
    peak: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  } {
    const current = this.getCurrentMemoryUsage();

    if (this.memoryHistory.length === 0) {
      return {
        current,
        average: current?.usedPercentage || 0,
        peak: current?.usedPercentage || 0,
        trend: 'stable',
      };
    }

    const usageValues = this.memoryHistory.map((h) => h.usedPercentage);
    const average =
      usageValues.reduce((sum, val) => sum + val, 0) / usageValues.length;
    const peak = Math.max(...usageValues);

    // Calculate trend based on recent history
    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (this.memoryHistory.length >= 5) {
      const recent = this.memoryHistory.slice(-5);
      const firstHalf = recent.slice(0, 2).map((h) => h.usedPercentage);
      const secondHalf = recent.slice(-2).map((h) => h.usedPercentage);

      const firstAvg =
        firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
      const secondAvg =
        secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;

      const difference = secondAvg - firstAvg;
      if (difference > 2) {
        trend = 'increasing';
      } else if (difference < -2) {
        trend = 'decreasing';
      }
    }

    return {
      current,
      average,
      peak,
      trend,
    };
  }

  /**
   * Format memory size for display
   */
  static formatMemorySize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  /**
   * Get memory recommendations based on current usage
   */
  getRecommendations(): string[] {
    const stats = this.getMemoryStats();
    const recommendations: string[] = [];

    if (!stats.current) {
      recommendations.push('Memory monitoring not available in this browser');
      return recommendations;
    }

    if (stats.current.usedPercentage > this.thresholds.critical) {
      recommendations.push(
        'Critical memory usage detected. Consider reducing song complexity or clearing cache.'
      );
    } else if (stats.current.usedPercentage > this.thresholds.warning) {
      recommendations.push(
        'High memory usage detected. Monitor performance and consider cleanup.'
      );
    }

    if (stats.trend === 'increasing') {
      recommendations.push(
        'Memory usage is increasing. Check for memory leaks or excessive caching.'
      );
    }

    if (stats.peak > 90) {
      recommendations.push(
        'Peak memory usage is very high. Consider implementing more aggressive cleanup.'
      );
    }

    if (recommendations.length === 0) {
      recommendations.push('Memory usage is within normal limits.');
    }

    return recommendations;
  }

  /**
   * Create a memory usage display element
   */
  createMemoryDisplay(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'memory-monitor-display';
    container.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 8px 12px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 12px;
      z-index: 10000;
      min-width: 200px;
    `;

    const updateDisplay = () => {
      const stats = this.getMemoryStats();
      if (!stats.current) {
        container.textContent = 'Memory API not available';
        return;
      }

      const used = MemoryMonitor.formatMemorySize(stats.current.usedJSHeapSize);
      const limit = MemoryMonitor.formatMemorySize(
        stats.current.jsHeapSizeLimit
      );
      const percentage = stats.current.usedPercentage.toFixed(1);

      container.innerHTML = `
        <div>Memory: ${used} / ${limit}</div>
        <div>Usage: ${percentage}% (${stats.trend})</div>
        <div>Peak: ${stats.peak.toFixed(1)}%</div>
      `;

      // Color coding based on usage
      if (stats.current.usedPercentage >= this.thresholds.critical) {
        container.style.background = 'rgba(220, 53, 69, 0.9)'; // Red
      } else if (stats.current.usedPercentage >= this.thresholds.warning) {
        container.style.background = 'rgba(255, 193, 7, 0.9)'; // Yellow
      } else {
        container.style.background = 'rgba(0, 0, 0, 0.8)'; // Default
      }
    };

    // Update display every second
    const displayInterval = setInterval(updateDisplay, 1000);
    updateDisplay();

    // Store cleanup function
    (container as any).destroy = () => {
      clearInterval(displayInterval);
      if (container.parentNode) {
        container.parentNode.removeChild(container);
      }
    };

    return container;
  }

  /**
   * Update thresholds
   */
  updateThresholds(thresholds: Partial<MemoryThresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
  }

  /**
   * Clear memory history
   */
  clearHistory(): void {
    this.memoryHistory = [];
  }

  /**
   * Destroy memory monitor
   */
  destroy(): void {
    this.stopMonitoring();
    this.cleanupCallbacks = [];
    this.memoryHistory = [];
  }
}

/**
 * Global memory monitor instance
 */
export const globalMemoryMonitor = new MemoryMonitor({
  onMemoryWarning: (usage) => {
    console.warn(`Memory usage high: ${usage.usedPercentage.toFixed(1)}%`);
  },
  onMemoryCritical: (usage) => {
    console.error(`Critical memory usage: ${usage.usedPercentage.toFixed(1)}%`);
  },
  onMemoryCleanup: (usage) => {
    console.log(
      `Memory cleanup triggered at ${usage.usedPercentage.toFixed(1)}%`
    );
  },
});

/**
 * Utility functions for memory management
 */
export const MemoryUtils = {
  /**
   * Estimate memory usage of a song
   */
  estimateSongMemoryUsage: (song: { lines: string[][] }): number => {
    let totalNotes = 0;
    song.lines.forEach((line) => {
      totalNotes += line.length;
    });

    // Rough estimate: each note requires about 1KB for rendering and caching
    return totalNotes * 1024;
  },

  /**
   * Check if a song is too large for current memory conditions
   */
  isSongTooLarge: (song: { lines: string[][] }): boolean => {
    const currentUsage = globalMemoryMonitor.getCurrentMemoryUsage();
    if (!currentUsage) return false;

    const estimatedUsage = MemoryUtils.estimateSongMemoryUsage(song);
    const availableMemory =
      currentUsage.jsHeapSizeLimit - currentUsage.usedJSHeapSize;

    return estimatedUsage > availableMemory * 0.5; // Use only 50% of available memory
  },

  /**
   * Get memory-safe song processing recommendations
   */
  getSongProcessingRecommendations: (song: { lines: string[][] }): string[] => {
    const recommendations: string[] = [];
    const totalNotes = song.lines.reduce((sum, line) => sum + line.length, 0);

    if (totalNotes > 1000) {
      recommendations.push(
        'Large song detected. Consider processing in smaller chunks.'
      );
    }

    if (MemoryUtils.isSongTooLarge(song)) {
      recommendations.push(
        'Song may exceed available memory. Consider reducing complexity.'
      );
    }

    const currentUsage = globalMemoryMonitor.getCurrentMemoryUsage();
    if (currentUsage && currentUsage.usedPercentage > 70) {
      recommendations.push(
        'High memory usage detected. Clear cache before processing.'
      );
    }

    return recommendations;
  },
};
