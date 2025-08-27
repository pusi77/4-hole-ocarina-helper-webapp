/**
 * PerformanceTestRunner - Automated performance testing and monitoring
 * Runs performance tests and provides real-time monitoring
 */

import {
  globalPerformanceTester,
  type PerformanceReport,
} from './PerformanceTester.js';
import {
  globalMemoryMonitor,
  type MemoryUsage as _MemoryUsage,
} from './MemoryMonitor.js';
import { LoadingUtils } from '../ui/LoadingManager.js';

export interface PerformanceTestConfig {
  runOnStartup?: boolean;
  runOnLargeSongs?: boolean;
  enableRealTimeMonitoring?: boolean;
  showPerformanceDisplay?: boolean;
  memoryThresholds?: {
    warning: number;
    critical: number;
  };
}

/**
 * Automated performance test runner and monitor
 */
export class PerformanceTestRunner {
  private config: PerformanceTestConfig;
  private isMonitoring: boolean = false;
  private performanceDisplay: HTMLElement | null = null;
  private testResults: PerformanceReport[] = [];

  constructor(config: PerformanceTestConfig = {}) {
    this.config = {
      runOnStartup: false,
      runOnLargeSongs: true,
      enableRealTimeMonitoring: true,
      showPerformanceDisplay: false,
      memoryThresholds: {
        warning: 70,
        critical: 85,
      },
      ...config,
    };
  }

  /**
   * Initialize performance monitoring
   */
  async initialize(): Promise<void> {
    console.log('PerformanceTestRunner: Initializing...');

    // Run startup tests if enabled
    if (this.config.runOnStartup) {
      await this.runStartupTests();
    }

    // Start real-time monitoring if enabled
    if (this.config.enableRealTimeMonitoring) {
      this.startRealTimeMonitoring();
    }

    // Show performance display if enabled
    if (this.config.showPerformanceDisplay) {
      this.showPerformanceDisplay();
    }

    console.log('PerformanceTestRunner: Initialized');
  }

  /**
   * Run startup performance tests
   */
  private async runStartupTests(): Promise<void> {
    LoadingUtils.showRenderingLoading();

    try {
      console.log('Running startup performance tests...');

      // Run basic performance tests
      const results = await globalPerformanceTester.runAllTests();
      this.testResults = results;

      // Log results
      const report = globalPerformanceTester.generateReport();
      console.log('Startup Performance Report:', report);

      // Check for critical issues
      const criticalIssues = results.filter((r) => !r.passed && r.score < 50);
      if (criticalIssues.length > 0) {
        console.warn('Critical performance issues detected:', criticalIssues);
      }

      LoadingUtils.hide();
    } catch (error) {
      console.error('Startup performance tests failed:', error);
      LoadingUtils.error(error as Error);
    }
  }

  /**
   * Start real-time performance monitoring
   */
  private startRealTimeMonitoring(): void {
    if (this.isMonitoring) {
      console.warn('Performance monitoring already started');
      return;
    }

    this.isMonitoring = true;

    // Start memory monitoring
    globalMemoryMonitor.startMonitoring(3000); // Check every 3 seconds

    // Set up memory event handlers
    globalMemoryMonitor.registerCleanupCallback(() => {
      console.log('Performance cleanup triggered');
      this.performCleanup();
    });

    console.log('Real-time performance monitoring started');
  }

  /**
   * Stop real-time monitoring
   */
  stopRealTimeMonitoring(): void {
    if (!this.isMonitoring) return;

    globalMemoryMonitor.stopMonitoring();
    this.isMonitoring = false;

    if (this.performanceDisplay) {
      this.hidePerformanceDisplay();
    }

    console.log('Real-time performance monitoring stopped');
  }

  /**
   * Show performance display overlay
   */
  showPerformanceDisplay(): void {
    if (this.performanceDisplay) return;

    this.performanceDisplay = this.createPerformanceDisplay();
    document.body.appendChild(this.performanceDisplay);

    // Update display every second
    const updateInterval = setInterval(() => {
      if (!this.performanceDisplay) {
        clearInterval(updateInterval);
        return;
      }
      this.updatePerformanceDisplay();
    }, 1000);

    // Store cleanup function
    (this.performanceDisplay as any).cleanup = () => {
      clearInterval(updateInterval);
    };
  }

  /**
   * Hide performance display
   */
  hidePerformanceDisplay(): void {
    if (!this.performanceDisplay) return;

    // Call cleanup function
    (this.performanceDisplay as any).cleanup?.();

    if (this.performanceDisplay.parentNode) {
      this.performanceDisplay.parentNode.removeChild(this.performanceDisplay);
    }

    this.performanceDisplay = null;
  }

  /**
   * Create performance display element
   */
  private createPerformanceDisplay(): HTMLElement {
    const display = document.createElement('div');
    display.className = 'performance-monitor';
    display.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: rgba(0, 0, 0, 0.9);
      color: white;
      padding: 12px;
      border-radius: 6px;
      font-family: 'Courier New', monospace;
      font-size: 11px;
      z-index: 10000;
      min-width: 250px;
      max-width: 300px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      backdrop-filter: blur(4px);
    `;

    // Add close button
    const closeButton = document.createElement('button');
    closeButton.innerHTML = '×';
    closeButton.style.cssText = `
      position: absolute;
      top: 4px;
      right: 6px;
      background: none;
      border: none;
      color: white;
      font-size: 16px;
      cursor: pointer;
      padding: 0;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    closeButton.onclick = () => this.hidePerformanceDisplay();

    display.appendChild(closeButton);
    return display;
  }

  /**
   * Update performance display
   */
  private updatePerformanceDisplay(): void {
    if (!this.performanceDisplay) return;

    const memoryStats = globalMemoryMonitor.getMemoryStats();
    const memoryUsage = memoryStats.current;

    let content =
      '<div style="margin-bottom: 8px; font-weight: bold;">Performance Monitor</div>';

    if (memoryUsage) {
      const usedMB = (memoryUsage.usedJSHeapSize / (1024 * 1024)).toFixed(1);
      const limitMB = (memoryUsage.jsHeapSizeLimit / (1024 * 1024)).toFixed(1);
      const percentage = memoryUsage.usedPercentage.toFixed(1);

      content += `
        <div>Memory: ${usedMB}MB / ${limitMB}MB</div>
        <div>Usage: ${percentage}% (${memoryStats.trend})</div>
        <div style="margin: 4px 0;">
          <div style="width: 100%; height: 4px; background: #333; border-radius: 2px; overflow: hidden;">
            <div style="width: ${percentage}%; height: 100%; background: ${this.getMemoryColor(memoryUsage.usedPercentage)}; transition: width 0.3s ease;"></div>
          </div>
        </div>
      `;

      // Update display color based on memory usage
      if (
        memoryUsage.usedPercentage >=
        (this.config.memoryThresholds?.critical || 85)
      ) {
        this.performanceDisplay.style.background = 'rgba(220, 53, 69, 0.95)';
      } else if (
        memoryUsage.usedPercentage >=
        (this.config.memoryThresholds?.warning || 70)
      ) {
        this.performanceDisplay.style.background = 'rgba(255, 193, 7, 0.95)';
        this.performanceDisplay.style.color = 'black';
      } else {
        this.performanceDisplay.style.background = 'rgba(0, 0, 0, 0.9)';
        this.performanceDisplay.style.color = 'white';
      }
    } else {
      content += '<div>Memory API not available</div>';
    }

    // Add test results summary
    if (this.testResults.length > 0) {
      const passedTests = this.testResults.filter((r) => r.passed).length;
      const totalTests = this.testResults.length;
      const averageScore =
        this.testResults.reduce((sum, r) => sum + r.score, 0) / totalTests;

      content += `
        <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.3);">
          <div>Tests: ${passedTests}/${totalTests} passed</div>
          <div>Score: ${averageScore.toFixed(0)}/100</div>
        </div>
      `;
    }

    // Add performance recommendations
    const recommendations = globalMemoryMonitor.getRecommendations();
    if (
      recommendations.length > 0 &&
      recommendations[0] !== 'Memory usage is within normal limits.'
    ) {
      content += `
        <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.3); font-size: 10px;">
          <div style="font-weight: bold;">Recommendations:</div>
          <div>${recommendations[0]}</div>
        </div>
      `;
    }

    this.performanceDisplay.innerHTML = content;

    // Re-add close button
    const closeButton = document.createElement('button');
    closeButton.innerHTML = '×';
    closeButton.style.cssText = `
      position: absolute;
      top: 4px;
      right: 6px;
      background: none;
      border: none;
      color: inherit;
      font-size: 16px;
      cursor: pointer;
      padding: 0;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    closeButton.onclick = () => this.hidePerformanceDisplay();
    this.performanceDisplay.appendChild(closeButton);
  }

  /**
   * Get color for memory usage bar
   */
  private getMemoryColor(percentage: number): string {
    if (percentage >= 85) return '#dc3545'; // Red
    if (percentage >= 70) return '#ffc107'; // Yellow
    if (percentage >= 50) return '#fd7e14'; // Orange
    return '#28a745'; // Green
  }

  /**
   * Perform performance cleanup
   */
  private performCleanup(): void {
    console.log('Performing performance cleanup...');

    // Clear test results cache
    globalPerformanceTester.clearResults();

    // Clear memory monitor history
    globalMemoryMonitor.clearHistory();

    // Force garbage collection if available
    if ((window as any).gc) {
      (window as any).gc();
    }

    console.log('Performance cleanup completed');
  }

  /**
   * Test song performance before processing
   */
  async testSongPerformance(song: { lines: string[][] }): Promise<{
    canProcess: boolean;
    recommendations: string[];
    estimatedTime: number;
  }> {
    const totalNotes = song.lines.reduce((sum, line) => sum + line.length, 0);
    const memoryStats = globalMemoryMonitor.getMemoryStats();

    let canProcess = true;
    const recommendations: string[] = [];
    let estimatedTime = totalNotes * 2; // 2ms per note estimate

    // Check memory conditions
    if (memoryStats.current && memoryStats.current.usedPercentage > 80) {
      canProcess = false;
      recommendations.push(
        'High memory usage detected. Clear cache before processing large songs.'
      );
      estimatedTime *= 2;
    }

    // Check song size
    if (totalNotes > 500) {
      recommendations.push(
        'Large song detected. Processing may take longer than usual.'
      );
      estimatedTime *= 1.5;
    }

    if (totalNotes > 1000) {
      canProcess = false;
      recommendations.push(
        'Song is very large. Consider breaking it into smaller sections.'
      );
      estimatedTime *= 3;
    }

    // Check performance trend
    if (memoryStats.trend === 'increasing') {
      recommendations.push(
        'Memory usage is increasing. Monitor performance during processing.'
      );
    }

    return {
      canProcess,
      recommendations,
      estimatedTime,
    };
  }

  /**
   * Get current performance status
   */
  getPerformanceStatus(): {
    isMonitoring: boolean;
    memoryUsage: number;
    testResults: PerformanceReport[];
    recommendations: string[];
  } {
    const memoryStats = globalMemoryMonitor.getMemoryStats();

    return {
      isMonitoring: this.isMonitoring,
      memoryUsage: memoryStats.current?.usedPercentage || 0,
      testResults: [...this.testResults],
      recommendations: globalMemoryMonitor.getRecommendations(),
    };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<PerformanceTestConfig>): void {
    this.config = { ...this.config, ...config };

    // Apply configuration changes
    if (config.showPerformanceDisplay !== undefined) {
      if (config.showPerformanceDisplay && !this.performanceDisplay) {
        this.showPerformanceDisplay();
      } else if (!config.showPerformanceDisplay && this.performanceDisplay) {
        this.hidePerformanceDisplay();
      }
    }

    if (config.memoryThresholds) {
      globalMemoryMonitor.updateThresholds(config.memoryThresholds);
    }
  }

  /**
   * Destroy performance test runner
   */
  destroy(): void {
    this.stopRealTimeMonitoring();
    this.hidePerformanceDisplay();
    this.testResults = [];
    console.log('PerformanceTestRunner: Destroyed');
  }
}

/**
 * Global performance test runner instance
 */
export const globalPerformanceTestRunner = new PerformanceTestRunner();

/**
 * Utility functions for performance testing
 */
export const PerformanceTestUtils = {
  /**
   * Quick performance check
   */
  quickCheck: async (): Promise<boolean> => {
    const memoryStats = globalMemoryMonitor.getMemoryStats();

    // Check if memory usage is acceptable
    if (memoryStats.current && memoryStats.current.usedPercentage > 85) {
      return false;
    }

    // Run a quick render test
    try {
      const result = await globalPerformanceTester.runTest('small-song-render');
      return result.passed;
    } catch {
      return false;
    }
  },

  /**
   * Enable performance monitoring for development
   */
  enableDevMode: (): void => {
    globalPerformanceTestRunner.updateConfig({
      showPerformanceDisplay: true,
      enableRealTimeMonitoring: true,
      runOnLargeSongs: true,
    });
  },

  /**
   * Disable performance monitoring for production
   */
  enableProdMode: (): void => {
    globalPerformanceTestRunner.updateConfig({
      showPerformanceDisplay: false,
      enableRealTimeMonitoring: false,
      runOnLargeSongs: false,
    });
  },
};
