/**
 * LoadingManager - Manages loading states and progress indicators
 * Provides centralized loading state management with progress tracking
 */

export interface LoadingState {
  isLoading: boolean;
  operation: string;
  progress: number; // 0-100
  message: string;
  startTime: number;
  estimatedDuration?: number;
}

export interface LoadingManagerEvents {
  onLoadingStart?: (state: LoadingState) => void;
  onLoadingProgress?: (state: LoadingState) => void;
  onLoadingComplete?: (state: LoadingState) => void;
  onLoadingError?: (error: Error, state: LoadingState) => void;
}

/**
 * Loading manager for handling various loading operations
 */
export class LoadingManager {
  private currentState: LoadingState | null = null;
  private events: LoadingManagerEvents;
  private progressInterval: ReturnType<typeof setInterval> | null = null;
  private loadingElement: HTMLElement | null = null;
  private progressBar: HTMLElement | null = null;
  private messageElement: HTMLElement | null = null;

  constructor(events: LoadingManagerEvents = {}) {
    this.events = events;
    this.createLoadingUI();
  }

  /**
   * Start a loading operation
   */
  startLoading(
    operation: string,
    message: string = 'Loading...',
    estimatedDuration?: number
  ): void {
    // End any existing loading operation
    if (this.currentState) {
      this.endLoading();
    }

    this.currentState = {
      isLoading: true,
      operation,
      progress: 0,
      message,
      startTime: performance.now(),
      estimatedDuration,
    };

    this.updateUI();
    this.startProgressTracking();

    if (this.events.onLoadingStart) {
      this.events.onLoadingStart({ ...this.currentState });
    }
  }

  /**
   * Update loading progress
   */
  updateProgress(progress: number, message?: string): void {
    if (!this.currentState) return;

    this.currentState.progress = Math.max(0, Math.min(100, progress));
    if (message) {
      this.currentState.message = message;
    }

    this.updateUI();

    if (this.events.onLoadingProgress) {
      this.events.onLoadingProgress({ ...this.currentState });
    }
  }

  /**
   * End loading operation
   */
  endLoading(): void {
    if (!this.currentState) return;

    const finalState = { ...this.currentState };
    finalState.progress = 100;
    finalState.isLoading = false;

    this.stopProgressTracking();
    this.hideUI();

    if (this.events.onLoadingComplete) {
      this.events.onLoadingComplete(finalState);
    }

    this.currentState = null;
  }

  /**
   * Handle loading error
   */
  handleError(error: Error): void {
    if (!this.currentState) return;

    const errorState = { ...this.currentState };
    errorState.isLoading = false;

    this.stopProgressTracking();
    this.hideUI();

    if (this.events.onLoadingError) {
      this.events.onLoadingError(error, errorState);
    }

    this.currentState = null;
  }

  /**
   * Get current loading state
   */
  getCurrentState(): LoadingState | null {
    return this.currentState ? { ...this.currentState } : null;
  }

  /**
   * Check if currently loading
   */
  isLoading(): boolean {
    return this.currentState?.isLoading ?? false;
  }

  /**
   * Create loading UI elements
   */
  private createLoadingUI(): void {
    // Create loading overlay
    this.loadingElement = document.createElement('div');
    this.loadingElement.className = 'loading-overlay';
    this.loadingElement.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(255, 255, 255, 0.9);
      display: none;
      justify-content: center;
      align-items: center;
      z-index: 9999;
      backdrop-filter: blur(2px);
    `;

    // Create loading content container
    const loadingContent = document.createElement('div');
    loadingContent.className = 'loading-content';
    loadingContent.style.cssText = `
      text-align: center;
      padding: 2rem;
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      min-width: 300px;
    `;

    // Create spinner
    const spinner = document.createElement('div');
    spinner.className = 'loading-spinner';
    spinner.style.cssText = `
      width: 40px;
      height: 40px;
      border: 4px solid #f3f3f3;
      border-top: 4px solid #3498db;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 1rem;
    `;

    // Create message element
    this.messageElement = document.createElement('div');
    this.messageElement.className = 'loading-message';
    this.messageElement.style.cssText = `
      font-size: 1rem;
      color: #333;
      margin-bottom: 1rem;
    `;

    // Create progress bar container
    const progressContainer = document.createElement('div');
    progressContainer.style.cssText = `
      width: 100%;
      height: 8px;
      background: #f0f0f0;
      border-radius: 4px;
      overflow: hidden;
      margin-bottom: 0.5rem;
    `;

    // Create progress bar
    this.progressBar = document.createElement('div');
    this.progressBar.className = 'loading-progress-bar';
    this.progressBar.style.cssText = `
      height: 100%;
      background: linear-gradient(90deg, #3498db, #2ecc71);
      width: 0%;
      transition: width 0.3s ease;
      border-radius: 4px;
    `;

    // Create progress text
    const progressText = document.createElement('div');
    progressText.className = 'loading-progress-text';
    progressText.style.cssText = `
      font-size: 0.875rem;
      color: #666;
    `;

    // Add CSS animation for spinner
    if (!document.querySelector('#loading-spinner-styles')) {
      const style = document.createElement('style');
      style.id = 'loading-spinner-styles';
      style.textContent = `
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `;
      document.head.appendChild(style);
    }

    // Assemble the UI
    progressContainer.appendChild(this.progressBar);
    loadingContent.appendChild(spinner);
    loadingContent.appendChild(this.messageElement);
    loadingContent.appendChild(progressContainer);
    loadingContent.appendChild(progressText);
    this.loadingElement.appendChild(loadingContent);

    // Add to document
    document.body.appendChild(this.loadingElement);
  }

  /**
   * Update loading UI
   */
  private updateUI(): void {
    if (!this.currentState || !this.loadingElement) return;

    // Show loading overlay
    this.loadingElement.style.display = 'flex';

    // Update message
    if (this.messageElement) {
      this.messageElement.textContent = this.currentState.message;
    }

    // Update progress bar
    if (this.progressBar) {
      this.progressBar.style.width = `${this.currentState.progress}%`;
    }

    // Update progress text
    const progressText = this.loadingElement.querySelector(
      '.loading-progress-text'
    );
    if (progressText) {
      const elapsed = performance.now() - this.currentState.startTime;
      const elapsedSeconds = Math.round(elapsed / 1000);

      let progressInfo = `${Math.round(this.currentState.progress)}%`;

      if (
        this.currentState.estimatedDuration &&
        this.currentState.progress > 0
      ) {
        const estimatedTotal = (elapsed / this.currentState.progress) * 100;
        const remaining = Math.max(0, estimatedTotal - elapsed);
        const remainingSeconds = Math.round(remaining / 1000);
        progressInfo += ` • ${remainingSeconds}s remaining`;
      } else if (elapsedSeconds > 0) {
        progressInfo += ` • ${elapsedSeconds}s elapsed`;
      }

      progressText.textContent = progressInfo;
    }
  }

  /**
   * Hide loading UI
   */
  private hideUI(): void {
    if (this.loadingElement) {
      this.loadingElement.style.display = 'none';
    }
  }

  /**
   * Start automatic progress tracking for operations without explicit progress
   */
  private startProgressTracking(): void {
    if (!this.currentState?.estimatedDuration) return;

    this.progressInterval = setInterval(() => {
      if (!this.currentState) return;

      const elapsed = performance.now() - this.currentState.startTime;
      const estimatedProgress = Math.min(
        95,
        (elapsed / this.currentState.estimatedDuration!) * 100
      );

      // Only update if we don't have explicit progress updates
      if (this.currentState.progress < estimatedProgress) {
        this.updateProgress(estimatedProgress);
      }
    }, 100);
  }

  /**
   * Stop automatic progress tracking
   */
  private stopProgressTracking(): void {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
  }

  /**
   * Wrap an async operation with loading state
   */
  async wrapOperation<T>(
    operation: () => Promise<T>,
    operationName: string,
    message: string = 'Processing...',
    estimatedDuration?: number
  ): Promise<T> {
    this.startLoading(operationName, message, estimatedDuration);

    try {
      const result = await operation();
      this.endLoading();
      return result;
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  /**
   * Simulate progress for operations without real progress tracking
   */
  simulateProgress(duration: number = 2000): void {
    if (!this.currentState) return;

    const startTime = performance.now();
    const interval = setInterval(() => {
      if (!this.currentState) {
        clearInterval(interval);
        return;
      }

      const elapsed = performance.now() - startTime;
      const progress = Math.min(95, (elapsed / duration) * 100);

      this.updateProgress(progress);

      if (progress >= 95) {
        clearInterval(interval);
      }
    }, 50);
  }

  /**
   * Destroy loading manager and cleanup
   */
  destroy(): void {
    this.stopProgressTracking();

    if (this.loadingElement && this.loadingElement.parentNode) {
      this.loadingElement.parentNode.removeChild(this.loadingElement);
    }

    this.currentState = null;
    this.loadingElement = null;
    this.progressBar = null;
    this.messageElement = null;
  }
}

/**
 * Global loading manager instance
 */
export const globalLoadingManager = new LoadingManager();

/**
 * Convenience functions for common loading operations
 */
export const LoadingUtils = {
  /**
   * Show loading for file operations
   */
  showFileLoading: (filename: string) => {
    globalLoadingManager.startLoading(
      'file-load',
      `Loading ${filename}...`,
      1000
    );
  },

  /**
   * Show loading for parsing operations
   */
  showParsingLoading: () => {
    globalLoadingManager.startLoading('parsing', 'Parsing notation...', 500);
  },

  /**
   * Show loading for rendering operations
   */
  showRenderingLoading: () => {
    globalLoadingManager.startLoading('rendering', 'Generating chart...', 800);
  },

  /**
   * Show loading for export operations
   */
  showExportLoading: () => {
    globalLoadingManager.startLoading('export', 'Preparing download...', 1200);
  },

  /**
   * Hide any current loading
   */
  hide: () => {
    globalLoadingManager.endLoading();
  },

  /**
   * Handle loading error
   */
  error: (error: Error) => {
    globalLoadingManager.handleError(error);
  },
};
