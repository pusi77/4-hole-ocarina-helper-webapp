/**
 * Error Boundary for handling unhandled JavaScript errors
 * Provides graceful error recovery and user-friendly error reporting
 */

export interface ErrorBoundaryConfig {
  onError?: (error: Error, errorInfo?: any) => void;
  fallbackUI?: HTMLElement | string;
  enableRecovery?: boolean;
  enableReporting?: boolean;
  maxRetries?: number;
}

export interface ErrorInfo {
  error: Error;
  timestamp: Date;
  userAgent: string;
  url: string;
  stack?: string;
  componentStack?: string;
  retryCount: number;
}

export class ErrorBoundary {
  private config: Required<ErrorBoundaryConfig>;
  private errorCount = 0;
  private lastError: ErrorInfo | null = null;
  private retryCount = 0;
  private isRecovering = false;

  constructor(config: ErrorBoundaryConfig = {}) {
    this.config = {
      onError: config.onError || this.defaultErrorHandler,
      fallbackUI: config.fallbackUI || this.createDefaultFallbackUI(),
      enableRecovery: config.enableRecovery ?? true,
      enableReporting: config.enableReporting ?? true,
      maxRetries: config.maxRetries ?? 3
    };

    this.setupGlobalErrorHandlers();
  }

  /**
   * Set up global error handlers for unhandled errors
   */
  private setupGlobalErrorHandlers(): void {
    // Handle JavaScript runtime errors
    window.addEventListener('error', (event) => {
      this.handleError(event.error || new Error(event.message), {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        type: 'javascript'
      });
    });

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      const error = event.reason instanceof Error 
        ? event.reason 
        : new Error(String(event.reason));
      
      this.handleError(error, {
        type: 'promise',
        promise: event.promise
      });
      
      // Prevent the default browser behavior (logging to console)
      event.preventDefault();
    });

    // Handle resource loading errors
    window.addEventListener('error', (event) => {
      if (event.target && event.target !== window) {
        const target = event.target as HTMLElement;
        const error = new Error(`Failed to load resource: ${target.tagName}`);
        
        this.handleError(error, {
          type: 'resource',
          element: target,
          src: (target as any).src || (target as any).href
        });
      }
    }, true);
  }

  /**
   * Handle an error with recovery and reporting
   */
  public handleError(error: Error, additionalInfo?: any): void {
    this.errorCount++;
    
    const errorInfo: ErrorInfo = {
      error,
      timestamp: new Date(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      stack: error.stack,
      componentStack: this.getComponentStack(),
      retryCount: this.retryCount
    };

    this.lastError = errorInfo;

    // Log error for debugging
    console.error('ErrorBoundary caught error:', error, additionalInfo);

    // Call custom error handler
    this.config.onError(error, { ...errorInfo, ...additionalInfo });

    // Attempt recovery if enabled
    if (this.config.enableRecovery && this.retryCount < this.config.maxRetries) {
      this.attemptRecovery(errorInfo);
    } else {
      this.showFallbackUI(errorInfo);
    }

    // Report error if enabled
    if (this.config.enableReporting) {
      this.reportError(errorInfo, additionalInfo);
    }
  }

  /**
   * Attempt to recover from the error
   */
  private async attemptRecovery(errorInfo: ErrorInfo): Promise<void> {
    if (this.isRecovering) return;
    
    this.isRecovering = true;
    this.retryCount++;

    try {
      // Show recovery message
      this.showRecoveryMessage();

      // Wait a moment before attempting recovery
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Attempt different recovery strategies based on error type
      const recovered = await this.tryRecoveryStrategies(errorInfo);

      if (recovered) {
        this.hideRecoveryMessage();
        this.showSuccessMessage('Application recovered successfully');
        this.retryCount = 0; // Reset retry count on successful recovery
      } else {
        throw new Error('Recovery failed');
      }
    } catch (recoveryError) {
      console.error('Recovery failed:', recoveryError);
      this.showFallbackUI(errorInfo);
    } finally {
      this.isRecovering = false;
    }
  }

  /**
   * Try different recovery strategies
   */
  private async tryRecoveryStrategies(errorInfo: ErrorInfo): Promise<boolean> {
    const strategies = [
      () => this.clearLocalStorage(),
      () => this.resetApplicationState(),
      () => this.reloadComponents(),
      () => this.softReload()
    ];

    for (const strategy of strategies) {
      try {
        await strategy();
        
        // Test if the application is working
        if (await this.testApplicationHealth()) {
          return true;
        }
      } catch (strategyError) {
        console.warn('Recovery strategy failed:', strategyError);
      }
    }

    return false;
  }

  /**
   * Clear localStorage to reset application state
   */
  private clearLocalStorage(): void {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (error) {
      console.warn('Failed to clear storage:', error);
    }
  }

  /**
   * Reset application state by dispatching custom events
   */
  private resetApplicationState(): void {
    // Dispatch custom reset event that components can listen to
    window.dispatchEvent(new CustomEvent('app:reset', {
      detail: { reason: 'error-recovery' }
    }));
  }

  /**
   * Reload components by re-initializing the main application
   */
  private reloadComponents(): void {
    // Find and re-initialize main app components
    const appContainer = document.querySelector('#app');
    if (appContainer) {
      // Dispatch re-initialization event
      window.dispatchEvent(new CustomEvent('app:reinitialize', {
        detail: { container: appContainer }
      }));
    }
  }

  /**
   * Soft reload by refreshing the page
   */
  private softReload(): void {
    window.location.reload();
  }

  /**
   * Test if the application is healthy after recovery
   */
  private async testApplicationHealth(): Promise<boolean> {
    try {
      // Check if main DOM elements exist
      const requiredElements = [
        '#app',
        '#song-input',
        '#chart-canvas'
      ];

      for (const selector of requiredElements) {
        if (!document.querySelector(selector)) {
          return false;
        }
      }

      // Test basic functionality
      const textArea = document.querySelector('#song-input') as HTMLTextAreaElement;
      const canvas = document.querySelector('#chart-canvas') as HTMLCanvasElement;
      
      if (!textArea || !canvas) {
        return false;
      }

      // Test if we can interact with elements
      textArea.focus();
      
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Show fallback UI when recovery fails
   */
  private showFallbackUI(errorInfo: ErrorInfo): void {
    const appContainer = document.querySelector('#app');
    if (!appContainer) return;

    // Create fallback UI
    const fallbackElement = typeof this.config.fallbackUI === 'string'
      ? this.createFallbackFromHTML(this.config.fallbackUI)
      : this.config.fallbackUI;

    // Replace app content with fallback
    appContainer.innerHTML = '';
    appContainer.appendChild(fallbackElement);

    // Add error details if in development
    if (import.meta.env.DEV) {
      this.addErrorDetails(fallbackElement, errorInfo);
    }
  }

  /**
   * Create default fallback UI
   */
  private createDefaultFallbackUI(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'error-boundary-fallback';
    container.innerHTML = `
      <div class="error-boundary-content">
        <div class="error-icon">⚠️</div>
        <h1>Something went wrong</h1>
        <p>We're sorry, but something unexpected happened. The application has encountered an error.</p>
        <div class="error-actions">
          <button id="retry-btn" class="btn btn-primary">Try Again</button>
          <button id="reload-btn" class="btn btn-secondary">Reload Page</button>
          <button id="report-btn" class="btn btn-secondary">Report Issue</button>
        </div>
        <details class="error-details">
          <summary>Technical Details</summary>
          <div class="error-info"></div>
        </details>
      </div>
    `;

    // Add event listeners
    this.setupFallbackEventListeners(container);

    return container;
  }

  /**
   * Create fallback UI from HTML string
   */
  private createFallbackFromHTML(html: string): HTMLElement {
    const container = document.createElement('div');
    container.innerHTML = html;
    return container.firstElementChild as HTMLElement || container;
  }

  /**
   * Set up event listeners for fallback UI
   */
  private setupFallbackEventListeners(container: HTMLElement): void {
    const retryBtn = container.querySelector('#retry-btn');
    const reloadBtn = container.querySelector('#reload-btn');
    const reportBtn = container.querySelector('#report-btn');

    retryBtn?.addEventListener('click', () => {
      if (this.retryCount < this.config.maxRetries) {
        window.location.reload();
      } else {
        this.showMessage('Maximum retry attempts reached. Please reload the page manually.');
      }
    });

    reloadBtn?.addEventListener('click', () => {
      window.location.reload();
    });

    reportBtn?.addEventListener('click', () => {
      this.showReportDialog();
    });
  }

  /**
   * Add error details to fallback UI (development only)
   */
  private addErrorDetails(container: HTMLElement, errorInfo: ErrorInfo): void {
    const errorInfoElement = container.querySelector('.error-info');
    if (errorInfoElement) {
      errorInfoElement.innerHTML = `
        <pre><code>${JSON.stringify({
          message: errorInfo.error.message,
          stack: errorInfo.stack,
          timestamp: errorInfo.timestamp.toISOString(),
          url: errorInfo.url,
          userAgent: errorInfo.userAgent,
          retryCount: errorInfo.retryCount
        }, null, 2)}</code></pre>
      `;
    }
  }

  /**
   * Show recovery message
   */
  private showRecoveryMessage(): void {
    this.showMessage('Attempting to recover from error...', 'info');
  }

  /**
   * Hide recovery message
   */
  private hideRecoveryMessage(): void {
    const message = document.querySelector('.error-boundary-message');
    if (message) {
      message.remove();
    }
  }

  /**
   * Show success message
   */
  private showSuccessMessage(text: string): void {
    this.showMessage(text, 'success');
    setTimeout(() => this.hideRecoveryMessage(), 3000);
  }

  /**
   * Show a message to the user
   */
  private showMessage(text: string, type: 'info' | 'success' | 'error' = 'info'): void {
    // Remove existing message
    this.hideRecoveryMessage();

    const message = document.createElement('div');
    message.className = `error-boundary-message error-boundary-message--${type}`;
    message.textContent = text;
    message.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: ${type === 'success' ? '#38a169' : type === 'error' ? '#c53030' : '#3182ce'};
      color: white;
      padding: 12px 24px;
      border-radius: 6px;
      z-index: 10000;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      font-weight: 500;
    `;

    document.body.appendChild(message);
  }

  /**
   * Show error report dialog
   */
  private showReportDialog(): void {
    if (!this.lastError) return;

    const reportData = {
      error: this.lastError.error.message,
      stack: this.lastError.stack,
      timestamp: this.lastError.timestamp.toISOString(),
      url: this.lastError.url,
      userAgent: this.lastError.userAgent
    };

    // Create a simple report dialog
    const dialog = document.createElement('div');
    dialog.className = 'error-report-dialog';
    dialog.innerHTML = `
      <div class="error-report-content">
        <h3>Report Error</h3>
        <p>Please copy the following information and report it to the developers:</p>
        <textarea readonly style="width: 100%; height: 200px; font-family: monospace; font-size: 12px;">${JSON.stringify(reportData, null, 2)}</textarea>
        <div class="error-report-actions">
          <button id="copy-report-btn" class="btn btn-primary">Copy to Clipboard</button>
          <button id="close-report-btn" class="btn btn-secondary">Close</button>
        </div>
      </div>
    `;

    dialog.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10001;
    `;

    const content = dialog.querySelector('.error-report-content') as HTMLElement;
    content.style.cssText = `
      background: white;
      padding: 24px;
      border-radius: 8px;
      max-width: 600px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
    `;

    document.body.appendChild(dialog);

    // Add event listeners
    dialog.querySelector('#copy-report-btn')?.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(JSON.stringify(reportData, null, 2));
        this.showMessage('Error report copied to clipboard', 'success');
      } catch (error) {
        console.error('Failed to copy to clipboard:', error);
      }
    });

    dialog.querySelector('#close-report-btn')?.addEventListener('click', () => {
      dialog.remove();
    });

    // Close on backdrop click
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) {
        dialog.remove();
      }
    });
  }

  /**
   * Get component stack trace (simplified)
   */
  private getComponentStack(): string {
    try {
      throw new Error();
    } catch (error) {
      return (error as Error).stack || 'No stack trace available';
    }
  }

  /**
   * Report error to external service (placeholder)
   */
  private reportError(errorInfo: ErrorInfo, additionalInfo?: any): void {
    // In a real application, you would send this to an error reporting service
    // like Sentry, LogRocket, or a custom endpoint
    
    const reportData = {
      ...errorInfo,
      additionalInfo,
      sessionId: this.getSessionId(),
      buildVersion: this.getBuildVersion()
    };

    // For now, just log to console in development
    if (import.meta.env.DEV) {
      console.group('Error Report');
      console.error('Error Info:', reportData);
      console.groupEnd();
    }

    // TODO: Implement actual error reporting
    // fetch('/api/errors', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(reportData)
    // }).catch(console.error);
  }

  /**
   * Get session ID for error tracking
   */
  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('error-boundary-session-id');
    if (!sessionId) {
      sessionId = Date.now().toString(36) + Math.random().toString(36).substr(2);
      sessionStorage.setItem('error-boundary-session-id', sessionId);
    }
    return sessionId;
  }

  /**
   * Get build version for error tracking
   */
  private getBuildVersion(): string {
    return import.meta.env.VITE_BUILD_VERSION || 'development';
  }

  /**
   * Default error handler
   */
  private defaultErrorHandler = (error: Error, errorInfo?: any): void => {
    console.error('Unhandled error:', error);
    if (errorInfo) {
      console.error('Error info:', errorInfo);
    }
  };

  /**
   * Get error statistics
   */
  public getErrorStats(): { errorCount: number; lastError: ErrorInfo | null; retryCount: number } {
    return {
      errorCount: this.errorCount,
      lastError: this.lastError,
      retryCount: this.retryCount
    };
  }

  /**
   * Reset error boundary state
   */
  public reset(): void {
    this.errorCount = 0;
    this.lastError = null;
    this.retryCount = 0;
    this.isRecovering = false;
  }

  /**
   * Destroy error boundary and clean up
   */
  public destroy(): void {
    // Remove event listeners would go here if we stored references
    // For now, the global listeners will remain but won't cause issues
    this.reset();
  }
}

// CSS for error boundary components
const errorBoundaryStyles = `
  .error-boundary-fallback {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    background-color: #f8f9fa;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  .error-boundary-content {
    max-width: 600px;
    text-align: center;
    background: white;
    padding: 3rem 2rem;
    border-radius: 12px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }

  .error-icon {
    font-size: 4rem;
    margin-bottom: 1rem;
  }

  .error-boundary-content h1 {
    color: #2d3748;
    margin-bottom: 1rem;
    font-size: 2rem;
    font-weight: 600;
  }

  .error-boundary-content p {
    color: #718096;
    margin-bottom: 2rem;
    line-height: 1.6;
  }

  .error-actions {
    display: flex;
    gap: 1rem;
    justify-content: center;
    margin-bottom: 2rem;
    flex-wrap: wrap;
  }

  .error-details {
    text-align: left;
    margin-top: 2rem;
  }

  .error-details summary {
    cursor: pointer;
    color: #718096;
    margin-bottom: 1rem;
  }

  .error-info {
    background: #f7fafc;
    padding: 1rem;
    border-radius: 6px;
    overflow-x: auto;
  }

  .error-info pre {
    margin: 0;
    font-size: 0.875rem;
    color: #2d3748;
  }

  .error-report-actions {
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
    margin-top: 1rem;
  }

  @media (max-width: 768px) {
    .error-boundary-content {
      padding: 2rem 1rem;
    }

    .error-actions {
      flex-direction: column;
      align-items: center;
    }

    .error-actions .btn {
      width: 100%;
      max-width: 200px;
    }
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = errorBoundaryStyles;
  document.head.appendChild(styleSheet);
}