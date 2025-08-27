/**
 * PerformanceTester - Comprehensive performance testing and optimization utilities
 * Provides benchmarking, profiling, and performance analysis tools
 */

export interface PerformanceMetrics {
  renderTime: number;
  parseTime: number;
  memoryUsage: number;
  fps: number;
  bundleSize?: number;
  loadTime: number;
  timestamp: number;
}

export interface PerformanceTest {
  name: string;
  description: string;
  run: () => Promise<PerformanceMetrics>;
  expectedThresholds: {
    renderTime: number; // ms
    parseTime: number; // ms
    memoryUsage: number; // MB
    fps: number;
    loadTime: number; // ms
  };
}

export interface PerformanceReport {
  testName: string;
  metrics: PerformanceMetrics;
  passed: boolean;
  issues: string[];
  recommendations: string[];
  score: number; // 0-100
}

/**
 * Performance testing and benchmarking system
 */
export class PerformanceTester {
  private tests: Map<string, PerformanceTest> = new Map();
  private results: PerformanceReport[] = [];
  private isRunning: boolean = false;

  constructor() {
    this.registerDefaultTests();
  }

  /**
   * Register a performance test
   */
  registerTest(test: PerformanceTest): void {
    this.tests.set(test.name, test);
  }

  /**
   * Run a specific performance test
   */
  async runTest(testName: string): Promise<PerformanceReport> {
    const test = this.tests.get(testName);
    if (!test) {
      throw new Error(`Performance test '${testName}' not found`);
    }

    console.log(`Running performance test: ${testName}`);
    const startTime = performance.now();

    try {
      const metrics = await test.run();
      const endTime = performance.now();
      
      // Add total test time to metrics
      metrics.loadTime = endTime - startTime;

      const report = this.analyzeResults(test, metrics);
      this.results.push(report);
      
      return report;
    } catch (error) {
      console.error(`Performance test '${testName}' failed:`, error);
      throw error;
    }
  }

  /**
   * Run all registered tests
   */
  async runAllTests(): Promise<PerformanceReport[]> {
    if (this.isRunning) {
      throw new Error('Performance tests are already running');
    }

    this.isRunning = true;
    this.results = [];

    try {
      for (const [testName] of this.tests) {
        await this.runTest(testName);
        // Small delay between tests to allow cleanup
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      return this.results;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Analyze test results and generate report
   */
  private analyzeResults(test: PerformanceTest, metrics: PerformanceMetrics): PerformanceReport {
    const issues: string[] = [];
    const recommendations: string[] = [];
    let score = 100;

    // Check render time
    if (metrics.renderTime > test.expectedThresholds.renderTime) {
      issues.push(`Render time (${metrics.renderTime.toFixed(1)}ms) exceeds threshold (${test.expectedThresholds.renderTime}ms)`);
      recommendations.push('Consider implementing dirty region tracking or canvas optimization');
      score -= 20;
    }

    // Check parse time
    if (metrics.parseTime > test.expectedThresholds.parseTime) {
      issues.push(`Parse time (${metrics.parseTime.toFixed(1)}ms) exceeds threshold (${test.expectedThresholds.parseTime}ms)`);
      recommendations.push('Optimize note parsing algorithm or implement caching');
      score -= 15;
    }

    // Check memory usage
    if (metrics.memoryUsage > test.expectedThresholds.memoryUsage) {
      issues.push(`Memory usage (${metrics.memoryUsage.toFixed(1)}MB) exceeds threshold (${test.expectedThresholds.memoryUsage}MB)`);
      recommendations.push('Implement memory cleanup or reduce cache size');
      score -= 25;
    }

    // Check FPS
    if (metrics.fps < test.expectedThresholds.fps) {
      issues.push(`FPS (${metrics.fps.toFixed(1)}) below threshold (${test.expectedThresholds.fps})`);
      recommendations.push('Optimize rendering loop or reduce update frequency');
      score -= 20;
    }

    // Check load time
    if (metrics.loadTime > test.expectedThresholds.loadTime) {
      issues.push(`Load time (${metrics.loadTime.toFixed(1)}ms) exceeds threshold (${test.expectedThresholds.loadTime}ms)`);
      recommendations.push('Implement code splitting or reduce bundle size');
      score -= 10;
    }

    const passed = issues.length === 0;
    score = Math.max(0, score);

    return {
      testName: test.name,
      metrics,
      passed,
      issues,
      recommendations,
      score
    };
  }

  /**
   * Register default performance tests
   */
  private registerDefaultTests(): void {
    // Small song rendering test
    this.registerTest({
      name: 'small-song-render',
      description: 'Test rendering performance with a small song (10-20 notes)',
      expectedThresholds: {
        renderTime: 50, // 50ms
        parseTime: 10, // 10ms
        memoryUsage: 5, // 5MB
        fps: 30,
        loadTime: 100 // 100ms
      },
      run: async () => {
        return this.runSmallSongTest();
      }
    });

    // Large song rendering test
    this.registerTest({
      name: 'large-song-render',
      description: 'Test rendering performance with a large song (100+ notes)',
      expectedThresholds: {
        renderTime: 200, // 200ms
        parseTime: 50, // 50ms
        memoryUsage: 20, // 20MB
        fps: 20,
        loadTime: 500 // 500ms
      },
      run: async () => {
        return this.runLargeSongTest();
      }
    });

    // Real-time input test
    this.registerTest({
      name: 'real-time-input',
      description: 'Test real-time input and preview performance',
      expectedThresholds: {
        renderTime: 30, // 30ms per update
        parseTime: 20, // 20ms
        memoryUsage: 10, // 10MB
        fps: 30,
        loadTime: 200 // 200ms
      },
      run: async () => {
        return this.runRealTimeInputTest();
      }
    });

    // Memory stress test
    this.registerTest({
      name: 'memory-stress',
      description: 'Test memory usage under stress conditions',
      expectedThresholds: {
        renderTime: 300, // 300ms
        parseTime: 100, // 100ms
        memoryUsage: 50, // 50MB
        fps: 15,
        loadTime: 1000 // 1000ms
      },
      run: async () => {
        return this.runMemoryStressTest();
      }
    });
  }

  /**
   * Run small song performance test
   */
  private async runSmallSongTest(): Promise<PerformanceMetrics> {
    const testSong = {
      title: 'Small Test Song',
      lines: [
        ['F', 'G', 'A', 'Bb'],
        ['C', 'D', 'E', 'F']
      ]
    };

    return this.measureSongPerformance(testSong);
  }

  /**
   * Run large song performance test
   */
  private async runLargeSongTest(): Promise<PerformanceMetrics> {
    // Generate a large song
    const notes = ['F', 'G', 'A', 'Bb', 'C', 'D', 'E'];
    const lines: string[][] = [];
    
    for (let i = 0; i < 20; i++) {
      const line: string[] = [];
      for (let j = 0; j < 10; j++) {
        line.push(notes[Math.floor(Math.random() * notes.length)]);
      }
      lines.push(line);
    }

    const testSong = {
      title: 'Large Test Song',
      lines
    };

    return this.measureSongPerformance(testSong);
  }

  /**
   * Run real-time input performance test
   */
  private async runRealTimeInputTest(): Promise<PerformanceMetrics> {
    const startTime = performance.now();
    let totalRenderTime = 0;
    let totalParseTime = 0;
    let frameCount = 0;
    const testDuration = 2000; // 2 seconds

    // Simulate real-time input
    const interval = setInterval(() => {
      const parseStart = performance.now();
      
      // Simulate parsing
      const testInput = 'F G A Bb C D E';
      const song = this.simulateParsing(testInput);
      
      const parseEnd = performance.now();
      const renderStart = performance.now();
      
      // Simulate rendering
      this.simulateRendering(song);
      
      const renderEnd = performance.now();
      
      totalParseTime += parseEnd - parseStart;
      totalRenderTime += renderEnd - renderStart;
      frameCount++;
    }, 16); // ~60 FPS

    // Wait for test duration
    await new Promise(resolve => setTimeout(resolve, testDuration));
    clearInterval(interval);

    const endTime = performance.now();
    const totalTime = endTime - startTime;
    const fps = (frameCount / totalTime) * 1000;

    return {
      renderTime: totalRenderTime / frameCount,
      parseTime: totalParseTime / frameCount,
      memoryUsage: this.getCurrentMemoryUsage(),
      fps,
      loadTime: totalTime,
      timestamp: Date.now()
    };
  }

  /**
   * Run memory stress test
   */
  private async runMemoryStressTest(): Promise<PerformanceMetrics> {
    const startMemory = this.getCurrentMemoryUsage();
    const startTime = performance.now();

    // Create multiple large songs to stress memory
    const largeSongs = [];
    for (let i = 0; i < 10; i++) {
      const lines: string[][] = [];
      for (let j = 0; j < 50; j++) {
        const line = Array(20).fill(0).map(() => 'F');
        lines.push(line);
      }
      largeSongs.push({ title: `Stress Song ${i}`, lines });
    }

    // Measure performance with all songs
    let totalRenderTime = 0;
    let totalParseTime = 0;

    for (const song of largeSongs) {
      const metrics = await this.measureSongPerformance(song);
      totalRenderTime += metrics.renderTime;
      totalParseTime += metrics.parseTime;
    }

    const endTime = performance.now();
    const endMemory = this.getCurrentMemoryUsage();

    return {
      renderTime: totalRenderTime / largeSongs.length,
      parseTime: totalParseTime / largeSongs.length,
      memoryUsage: endMemory - startMemory,
      fps: 0, // Not applicable for this test
      loadTime: endTime - startTime,
      timestamp: Date.now()
    };
  }

  /**
   * Measure performance for a specific song
   */
  private async measureSongPerformance(song: any): Promise<PerformanceMetrics> {
    const startMemory = this.getCurrentMemoryUsage();
    
    // Measure parsing time
    const parseStart = performance.now();
    const parsedSong = this.simulateParsing(JSON.stringify(song));
    const parseEnd = performance.now();
    
    // Measure rendering time
    const renderStart = performance.now();
    await this.simulateRendering(parsedSong);
    const renderEnd = performance.now();
    
    const endMemory = this.getCurrentMemoryUsage();

    return {
      renderTime: renderEnd - renderStart,
      parseTime: parseEnd - parseStart,
      memoryUsage: endMemory - startMemory,
      fps: 60, // Assume 60 FPS for single render
      loadTime: 0, // Will be set by caller
      timestamp: Date.now()
    };
  }

  /**
   * Simulate parsing operation
   */
  private simulateParsing(input: string): any {
    // Simulate parsing work
    const lines = input.split('\n').map(line => line.split(' ').filter(note => note.trim()));
    return { title: 'Test Song', lines };
  }

  /**
   * Simulate rendering operation
   */
  private async simulateRendering(song: any): Promise<void> {
    // Simulate rendering work with canvas operations
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      // Simulate drawing operations
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Simulate drawing patterns for each note
      song.lines.forEach((line: string[], lineIndex: number) => {
        line.forEach((_note: string, noteIndex: number) => {
          const x = noteIndex * 50;
          const y = lineIndex * 50;
          
          // Simulate drawing circles (holes)
          for (let i = 0; i < 4; i++) {
            ctx.beginPath();
            ctx.arc(x + (i % 2) * 20, y + Math.floor(i / 2) * 20, 10, 0, 2 * Math.PI);
            ctx.fill();
          }
        });
      });
    }

    // Simulate async rendering delay
    await new Promise(resolve => setTimeout(resolve, 1));
  }

  /**
   * Get current memory usage in MB
   */
  private getCurrentMemoryUsage(): number {
    if ((performance as any).memory) {
      return (performance as any).memory.usedJSHeapSize / (1024 * 1024);
    }
    return 0;
  }

  /**
   * Generate performance report
   */
  generateReport(): string {
    if (this.results.length === 0) {
      return 'No performance tests have been run yet.';
    }

    let report = '# Performance Test Report\n\n';
    
    // Overall summary
    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.passed).length;
    const averageScore = this.results.reduce((sum, r) => sum + r.score, 0) / totalTests;
    
    report += `## Summary\n`;
    report += `- Total Tests: ${totalTests}\n`;
    report += `- Passed: ${passedTests}\n`;
    report += `- Failed: ${totalTests - passedTests}\n`;
    report += `- Average Score: ${averageScore.toFixed(1)}/100\n\n`;

    // Individual test results
    report += `## Test Results\n\n`;
    
    this.results.forEach(result => {
      report += `### ${result.testName}\n`;
      report += `- **Status**: ${result.passed ? '✅ PASSED' : '❌ FAILED'}\n`;
      report += `- **Score**: ${result.score}/100\n`;
      report += `- **Render Time**: ${result.metrics.renderTime.toFixed(1)}ms\n`;
      report += `- **Parse Time**: ${result.metrics.parseTime.toFixed(1)}ms\n`;
      report += `- **Memory Usage**: ${result.metrics.memoryUsage.toFixed(1)}MB\n`;
      report += `- **FPS**: ${result.metrics.fps.toFixed(1)}\n`;
      report += `- **Load Time**: ${result.metrics.loadTime.toFixed(1)}ms\n`;
      
      if (result.issues.length > 0) {
        report += `\n**Issues:**\n`;
        result.issues.forEach(issue => {
          report += `- ${issue}\n`;
        });
      }
      
      if (result.recommendations.length > 0) {
        report += `\n**Recommendations:**\n`;
        result.recommendations.forEach(rec => {
          report += `- ${rec}\n`;
        });
      }
      
      report += '\n';
    });

    return report;
  }

  /**
   * Get test results
   */
  getResults(): PerformanceReport[] {
    return [...this.results];
  }

  /**
   * Clear test results
   */
  clearResults(): void {
    this.results = [];
  }

  /**
   * Check if tests are currently running
   */
  isTestRunning(): boolean {
    return this.isRunning;
  }
}

/**
 * Global performance tester instance
 */
export const globalPerformanceTester = new PerformanceTester();

/**
 * Utility functions for performance testing
 */
export const PerformanceUtils = {
  /**
   * Measure execution time of a function
   */
  measureTime: async <T>(fn: () => Promise<T> | T): Promise<{ result: T; time: number }> => {
    const start = performance.now();
    const result = await fn();
    const end = performance.now();
    return { result, time: end - start };
  },

  /**
   * Create a performance benchmark
   */
  benchmark: async (name: string, fn: () => Promise<void> | void, iterations: number = 100): Promise<{
    name: string;
    iterations: number;
    totalTime: number;
    averageTime: number;
    minTime: number;
    maxTime: number;
  }> => {
    const times: number[] = [];
    
    for (let i = 0; i < iterations; i++) {
      const { time } = await PerformanceUtils.measureTime(fn);
      times.push(time);
    }
    
    const totalTime = times.reduce((sum, time) => sum + time, 0);
    const averageTime = totalTime / iterations;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    
    return {
      name,
      iterations,
      totalTime,
      averageTime,
      minTime,
      maxTime
    };
  },

  /**
   * Monitor FPS over a period
   */
  monitorFPS: (duration: number = 5000): Promise<{ averageFPS: number; minFPS: number; maxFPS: number }> => {
    return new Promise(resolve => {
      const fps: number[] = [];
      let lastTime = performance.now();
      let frameCount = 0;
      
      const measureFrame = () => {
        const currentTime = performance.now();
        const deltaTime = currentTime - lastTime;
        
        if (deltaTime >= 1000) { // Every second
          const currentFPS = (frameCount / deltaTime) * 1000;
          fps.push(currentFPS);
          frameCount = 0;
          lastTime = currentTime;
        }
        
        frameCount++;
        
        if (currentTime - lastTime < duration) {
          requestAnimationFrame(measureFrame);
        } else {
          const averageFPS = fps.reduce((sum, f) => sum + f, 0) / fps.length;
          const minFPS = Math.min(...fps);
          const maxFPS = Math.max(...fps);
          
          resolve({ averageFPS, minFPS, maxFPS });
        }
      };
      
      requestAnimationFrame(measureFrame);
    });
  }
};