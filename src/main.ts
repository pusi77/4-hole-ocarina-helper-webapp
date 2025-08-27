import './styles/main.css';
import { RealTimeApp } from './ui/RealTimeApp.js';
import { ExportManager } from './ui/ExportManager.js';
import { ErrorHandlingManager } from './ui/ErrorHandlingManager.js';
import { AccessibilityManager } from './ui/AccessibilityManager.js';
import { ErrorBoundary } from './ui/ErrorBoundary.js';
import { globalPerformanceTestRunner, PerformanceTestUtils } from './utils/PerformanceTestRunner.js';
import { LoadingUtils } from './ui/LoadingManager.js';

// Ocarina Fingering Chart Web Application
// Entry point for the application

// Global error boundary instance
let globalErrorBoundary: ErrorBoundary;

/**
 * Initialize the application with real-time text input and preview
 */
async function initializeApp(): Promise<void> {
  // Show loading state during initialization
  LoadingUtils.showRenderingLoading();
  
  try {
    // Initialize global error boundary first
    globalErrorBoundary = new ErrorBoundary({
      onError: (error, errorInfo) => {
        console.error('Global error caught:', error, errorInfo);
        
        // Track error in production
        if (!import.meta.env.DEV) {
          // In production, you might want to send to analytics
          trackError(error, errorInfo);
        }
      },
      enableRecovery: true,
      enableReporting: !import.meta.env.DEV, // Only report in production
      maxRetries: 3
    });

    // Initialize performance monitoring
    await globalPerformanceTestRunner.initialize();
    
    // Enable development mode if in development
    if (import.meta.env.DEV) {
      PerformanceTestUtils.enableDevMode();
    } else {
      PerformanceTestUtils.enableProdMode();
    }
  // Verify that the required HTML structure exists
  const appContainer = document.querySelector<HTMLDivElement>('#app')!;
  if (!appContainer) {
    throw new Error('App container not found');
  }
  
  // Get DOM elements
  const titleInput = document.getElementById('song-title') as HTMLInputElement;
  const textArea = document.getElementById('song-input') as HTMLTextAreaElement;
  const canvas = document.getElementById('chart-canvas') as HTMLCanvasElement;
  const clearBtn = document.getElementById('clear-btn') as HTMLButtonElement;
  const exportBtn = document.getElementById('export-btn') as HTMLButtonElement;
  const exampleBtn = document.getElementById('example-btn') as HTMLButtonElement;
  const notificationContainer = document.querySelector('.notification-container') as HTMLElement;
  
  if (!titleInput || !textArea || !canvas || !notificationContainer) {
    throw new Error('Required DOM elements not found');
  }

  // Initialize export manager
  const exportManager = new ExportManager({
    includeTimestamp: true,
    quality: 1.0,
    maxFilenameLength: 50
  });

  // Initialize accessibility manager
  const accessibilityManager = new AccessibilityManager({
    enableKeyboardShortcuts: true,
    enableScreenReaderSupport: true,
    enableAriaLiveRegions: true,
    enableFocusManagement: true,
    enableChartDescriptions: true,
    announceValidationChanges: true,
    announceStateChanges: true
  });

  // Initialize accessibility features
  accessibilityManager.initialize({
    textArea,
    canvas,
    exportButton: exportBtn,
    clearButton: clearBtn,
    exampleButton: exampleBtn,
    titleInput
  });

  // Initialize comprehensive error handling system
  const errorHandlingManager = new ErrorHandlingManager({
    onErrorHandled: (error, recovered) => {
      console.log('Error handled:', error.message, recovered ? '(recovered)' : '(not recovered)');
    },
    onWarningHandled: (warning) => {
      console.log('Warning handled:', warning.message);
    },
    onSuccessNotification: (title, message) => {
      console.log('Success:', title, message);
    },
    onStateRecovered: (_previousState, newState) => {
      console.log('State recovered from error');
      // Update the app with recovered state
      if (newState.inputText && newState.inputText !== app.getText()) {
        app.setText(newState.inputText);
      }
    },
    onRecoveryFailed: (error, attempts) => {
      console.warn('Recovery failed after', attempts, 'attempts:', error.message);
    },
    onValidationImproved: (previous, current) => {
      console.log('Validation improved:', previous.errors.length, '->', current.errors.length, 'errors');
    }
  }, {
    enableSuccessNotifications: true,
    enableWarningNotifications: true,
    enableErrorRecovery: true,
    enableStatePreservation: true,
    notifications: {
      autoHide: true,
      hideDelay: 5000,
      maxNotifications: 5,
      position: 'top',
      showIcons: true,
      allowDismiss: true
    },
    highlighting: {
      showLineNumbers: false,
      showTooltips: true,
      highlightEntireLine: true,
      showGutterIcons: false,
      maxTooltipLength: 300
    },
    recovery: {
      enableAutoRecovery: true,
      enableStateBackup: true,
      maxRecoveryAttempts: 3,
      backupInterval: 30000,
      maxBackupHistory: 10,
      enableErrorBoundary: true,
      fallbackToLastValidState: true
    }
  });

  // Initialize error handling with DOM elements
  errorHandlingManager.initialize({
    notificationContainer,
    textArea
  });
  
  // Initialize the real-time application
  const app = new RealTimeApp(textArea, canvas, {
    onSongChanged: (song) => {
      // Update export state based on whether we have a valid song and canvas content
      const canExport = song !== null && app.canExport();
      exportManager.updateExportState(canExport);
      
      // Update accessibility features
      accessibilityManager.updateChartDescription(song);
      accessibilityManager.updateButtonStates({
        canExport,
        isExporting: false,
        hasContent: song !== null
      });
      
      if (song) {
        console.log('Song updated:', song.title, `(${song.lines.length} lines)`);
        
        // Show success notification for successful song parsing
        errorHandlingManager.showSuccess(
          'Song Parsed Successfully',
          `"${song.title}" loaded with ${song.lines.length} line${song.lines.length !== 1 ? 's' : ''} of notation`
        );
      }
    },
    
    onValidationChanged: async (result) => {
      console.log('Validation result:', result.isValid ? 'valid' : 'invalid', 
                  `(${result.errors.length} errors, ${result.warnings.length} warnings)`);
      
      // Handle validation through accessibility manager
      accessibilityManager.handleValidationResult(result);
      
      // Handle validation through comprehensive error handling system
      const currentState = {
        currentSong: app.getCurrentSong(),
        inputText: app.getText(),
        validationResult: result,
        isLoading: false,
        errors: result.errors,
        isExporting: false,
        lastUpdateTimestamp: new Date()
      };

      const handlingResult = await errorHandlingManager.handleValidationResult(
        result,
        currentState,
        app.getText()
      );

      // Apply recovery if successful
      if (handlingResult.recovered && handlingResult.newInputText) {
        app.setText(handlingResult.newInputText);
      }
      
      // Update export state based on validation
      const canExport = result.isValid && app.canExport();
      exportManager.updateExportState(canExport);
      accessibilityManager.updateButtonStates({
        canExport,
        isExporting: false,
        hasContent: app.getText().trim().length > 0
      });
    },
    
    onError: async (error) => {
      console.error('Application error:', error.message);
      
      // Handle error through comprehensive error handling system
      const currentState = {
        currentSong: app.getCurrentSong(),
        inputText: app.getText(),
        isLoading: false,
        errors: [error],
        isExporting: false,
        lastUpdateTimestamp: new Date()
      };

      const handlingResult = await errorHandlingManager.handleError(
        error,
        currentState,
        app.getText()
      );

      // Apply recovery if successful
      if (handlingResult.recovered && handlingResult.newInputText) {
        app.setText(handlingResult.newInputText);
      }
      
      // Disable export on error
      exportManager.updateExportState(false);
    },
    
    onTextChanged: (text) => {
      // Update export state when text changes
      const canExport = text.trim().length > 0 && app.canExport();
      exportManager.updateExportState(canExport);
      
      console.log('Text changed, length:', text.length);
    }
  }, {}, titleInput);

  // Subscribe to export state changes
  exportManager.subscribe((state) => {
    exportBtn.disabled = !state.canExport || state.isExporting;
    
    // Update button text based on state
    if (state.isExporting) {
      exportBtn.textContent = 'Exporting...';
    } else {
      exportBtn.textContent = 'Export PNG';
    }
    
    // Update button title with additional info
    if (state.canExport) {
      exportBtn.title = 'Download the current chart as a PNG image';
    } else {
      exportBtn.title = 'Enter valid song notation to enable export';
    }
  });
  

  // Set up example loading functionality
  setupExampleLoader(exampleBtn, app);
  
  // Set up button event handlers
  clearBtn.addEventListener('click', () => {
    app.clear();
    app.focus();
  });
  
  exportBtn.addEventListener('click', async () => {
    try {
      const currentSong = app.getCurrentSong();
      if (!currentSong) {
        throw new Error('No song available to export');
      }

      // Update accessibility state for exporting
      accessibilityManager.updateButtonStates({
        canExport: true,
        isExporting: true,
        hasContent: true
      });

      // Use the export manager for enhanced export functionality
      const result = await exportManager.exportCanvasToPNG(canvas, currentSong);
      
      if (result.success) {
        console.log('Export successful:', result.filename, `(${result.size} bytes)`);
        
        // Show success notification through error handling system
        errorHandlingManager.handleExportSuccess(result.filename || 'chart.png', result.size || 0);
        
        // Announce export success to screen reader
        accessibilityManager.announceToScreenReader(
          `Chart exported successfully as ${result.filename || 'chart.png'}`,
          'assertive'
        );
        
        // Show brief button feedback
        const originalText = exportBtn.textContent;
        exportBtn.textContent = 'Exported!';
        setTimeout(() => {
          exportBtn.textContent = originalText;
        }, 2000);
      } else {
        throw new Error(result.error || 'Export failed');
      }
      
    } catch (error) {
      console.error('Export failed:', error);
      
      // Handle export error through error handling system
      const exportError = {
        type: 'export_error' as any,
        message: error instanceof Error ? error.message : 'Export failed',
        suggestions: [
          'Ensure you have a valid chart to export',
          'Try refreshing the page and generating the chart again',
          'Check that your browser supports file downloads'
        ]
      };
      
      errorHandlingManager.handleError(
        exportError,
        {
          currentSong: app.getCurrentSong(),
          inputText: app.getText(),
          isLoading: false,
          errors: [exportError],
          isExporting: false,
          lastUpdateTimestamp: new Date()
        },
        app.getText()
      );
    } finally {
      // Reset export state
      accessibilityManager.updateButtonStates({
        canExport: app.canExport(),
        isExporting: false,
        hasContent: app.getText().trim().length > 0
      });
    }
  });
  
  // Set up collapsible sections for mobile
  setupCollapsibleSections();
  
  // Set up responsive canvas sizing
  setupResponsiveCanvas(canvas);
  
  // Focus the text area initially
  app.focus();
  
  // Hide loading state
  LoadingUtils.hide();
  
  } catch (error) {
    LoadingUtils.error(error as Error);
    console.error('Failed to initialize application:', error);
    
    // Handle initialization error through error boundary
    if (globalErrorBoundary) {
      globalErrorBoundary.handleError(error as Error, {
        phase: 'initialization',
        timestamp: new Date().toISOString()
      });
    }
  }
}

/**
 * Track errors in production (placeholder for analytics)
 */
function trackError(error: Error, errorInfo?: any): void {
  // In a real application, you would send this to your analytics service
  // Examples: Google Analytics, Mixpanel, Amplitude, etc.
  
  try {
    // Example analytics call (replace with your service)
    if (typeof (window as any).gtag !== 'undefined') {
      (window as any).gtag('event', 'exception', {
        description: error.message,
        fatal: false,
        custom_map: {
          error_stack: error.stack,
          error_info: JSON.stringify(errorInfo)
        }
      });
    }
    
    // Example for other analytics services
    // analytics.track('Application Error', {
    //   error_message: error.message,
    //   error_stack: error.stack,
    //   error_info: errorInfo,
    //   timestamp: new Date().toISOString()
    // });
  } catch (trackingError) {
    console.warn('Failed to track error:', trackingError);
  }
}



/**
 * Set up example loading functionality
 */
function setupExampleLoader(exampleBtn: HTMLButtonElement, app: RealTimeApp): void {
  const examples = [
    {
      title: 'Simple Melody',
      notation: `F G A F
G A C D`
    },
    {
      title: 'Mary Had a Little Lamb',
      notation: `E D C D E E E
D D D E G G
E D C D E E E
E D D E D C`
    },
    {
      title: 'Twinkle Twinkle Little Star',
      notation: `C C G G A A G
F F E E D D C
G G F F E E D
G G F F E E D`
    },
    {
      title: 'Simple Scale',
      notation: `F G A Bb C D E`
    },
    {
      title: 'All Notes Test',
      notation: `F F F G G G
A A A Bb Bb Bb
C C C D D D
E E E`
    }
  ];

  let currentExampleIndex = 0;

  exampleBtn.addEventListener('click', () => {
    const example = examples[currentExampleIndex];
    
    // Set title and notation separately
    app.setTitle(example.title);
    app.setText(example.notation);
    
    // Cycle to next example
    currentExampleIndex = (currentExampleIndex + 1) % examples.length;
    
    // Update button text to show next example
    const nextExample = examples[currentExampleIndex];
    exampleBtn.textContent = `Load Example: ${nextExample.title}`;
    
    // Reset to first example text after cycling through all
    if (currentExampleIndex === 0) {
      setTimeout(() => {
        exampleBtn.textContent = 'Load Example';
      }, 3000);
    }
  });

  // Set initial button text
  exampleBtn.textContent = `Load Example: ${examples[0].title}`;
}

/**
 * Set up collapsible sections for mobile devices
 */
function setupCollapsibleSections(): void {
  const inputSection = document.querySelector('.input-section');
  const previewSection = document.querySelector('.preview-section');
  
  if (!inputSection || !previewSection) return;
  
  // Add click handlers for mobile collapsible sections
  const inputHeader = inputSection.querySelector('h2');
  const previewHeader = previewSection.querySelector('h2');
  
  if (inputHeader && previewHeader) {
    // Only enable collapsible behavior on mobile
    const handleResize = () => {
      const isMobile = window.innerWidth <= 768;
      
      if (isMobile) {
        inputHeader.setAttribute('role', 'button');
        inputHeader.setAttribute('aria-expanded', 'true');
        inputHeader.setAttribute('tabindex', '0');
        previewHeader.setAttribute('role', 'button');
        previewHeader.setAttribute('aria-expanded', 'true');
        previewHeader.setAttribute('tabindex', '0');
        
        inputHeader.addEventListener('click', toggleInputSection);
        inputHeader.addEventListener('keydown', handleKeydown);
        previewHeader.addEventListener('click', togglePreviewSection);
        previewHeader.addEventListener('keydown', handleKeydown);
      } else {
        inputHeader.removeAttribute('role');
        inputHeader.removeAttribute('aria-expanded');
        inputHeader.removeAttribute('tabindex');
        previewHeader.removeAttribute('role');
        previewHeader.removeAttribute('aria-expanded');
        previewHeader.removeAttribute('tabindex');
        
        inputHeader.removeEventListener('click', toggleInputSection);
        inputHeader.removeEventListener('keydown', handleKeydown);
        previewHeader.removeEventListener('click', togglePreviewSection);
        previewHeader.removeEventListener('keydown', handleKeydown);
        
        // Ensure sections are expanded on desktop
        inputSection.classList.remove('collapsed');
        previewSection.classList.remove('collapsed');
      }
    };
    
    // Handle keyboard navigation
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        (e.target as HTMLElement).click();
      }
    };
    
    // Toggle functions
    const toggleInputSection = () => {
      const isCollapsed = inputSection.classList.toggle('collapsed');
      inputHeader.setAttribute('aria-expanded', (!isCollapsed).toString());
    };
    
    const togglePreviewSection = () => {
      const isCollapsed = previewSection.classList.toggle('collapsed');
      previewHeader.setAttribute('aria-expanded', (!isCollapsed).toString());
    };
    
    // Set up initial state and listen for resize
    handleResize();
    window.addEventListener('resize', handleResize);
  }
}

/**
 * Set up responsive canvas sizing
 */
function setupResponsiveCanvas(canvas: HTMLCanvasElement): void {
  const canvasContainer = canvas.parentElement;
  if (!canvasContainer) return;
  
  // Update canvas container state based on content
  const updateCanvasState = () => {
    const hasContent = canvas.width > 0 && canvas.height > 0;
    canvasContainer.classList.toggle('has-content', hasContent);
  };
  
  // Observe canvas changes
  const observer = new MutationObserver(updateCanvasState);
  observer.observe(canvas, { 
    attributes: true, 
    attributeFilter: ['width', 'height'] 
  });
  
  // Handle window resize for responsive canvas
  const handleCanvasResize = () => {
    // Trigger canvas resize if needed
    const event = new CustomEvent('canvasResize');
    canvas.dispatchEvent(event);
  };
  
  window.addEventListener('resize', handleCanvasResize);
  
  // Initial state
  updateCanvasState();
}

/**
 * Register service worker for offline functionality and performance
 */
async function registerServiceWorker(): Promise<void> {
  if ('serviceWorker' in navigator && !import.meta.env.DEV) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered successfully:', registration);
      
      // Handle service worker updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New service worker is available
              showUpdateAvailableNotification(registration);
            }
          });
        }
      });
      
      // Listen for service worker messages
      navigator.serviceWorker.addEventListener('message', (event) => {
        const { type, payload } = event.data;
        
        switch (type) {
          case 'CACHE_UPDATED':
            console.log('Cache updated:', payload);
            break;
          case 'OFFLINE_READY':
            console.log('App is ready for offline use');
            break;
        }
      });
      
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }
}

/**
 * Show notification when app update is available
 */
function showUpdateAvailableNotification(registration: ServiceWorkerRegistration): void {
  // Create update notification
  const notification = document.createElement('div');
  notification.className = 'update-notification';
  notification.innerHTML = `
    <div class="update-content">
      <span>A new version of the app is available!</span>
      <button id="update-btn" class="btn btn-primary btn-sm">Update</button>
      <button id="dismiss-btn" class="btn btn-secondary btn-sm">Later</button>
    </div>
  `;
  
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 1rem;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    z-index: 10000;
    max-width: 300px;
  `;
  
  const content = notification.querySelector('.update-content') as HTMLElement;
  content.style.cssText = `
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    align-items: flex-start;
  `;
  
  document.body.appendChild(notification);
  
  // Handle update button
  notification.querySelector('#update-btn')?.addEventListener('click', () => {
    if (registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  });
  
  // Handle dismiss button
  notification.querySelector('#dismiss-btn')?.addEventListener('click', () => {
    notification.remove();
  });
  
  // Auto-dismiss after 10 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.remove();
    }
  }, 10000);
}

/**
 * Initialize performance monitoring and analytics
 */
function initializeAnalytics(): void {
  // Only in production
  if (import.meta.env.DEV) return;
  
  // Web Vitals monitoring
  if ('PerformanceObserver' in window) {
    // Monitor Largest Contentful Paint (LCP)
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'largest-contentful-paint') {
          console.log('LCP:', entry.startTime);
          // Track in analytics
          trackPerformanceMetric('LCP', entry.startTime);
        }
      }
    }).observe({ entryTypes: ['largest-contentful-paint'] });
    
    // Monitor First Input Delay (FID)
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'first-input') {
          const fid = (entry as any).processingStart - entry.startTime;
          console.log('FID:', fid);
          trackPerformanceMetric('FID', fid);
        }
      }
    }).observe({ entryTypes: ['first-input'] });
    
    // Monitor Cumulative Layout Shift (CLS)
    let clsValue = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'layout-shift' && !(entry as any).hadRecentInput) {
          clsValue += (entry as any).value;
        }
      }
    }).observe({ entryTypes: ['layout-shift'] });
    
    // Report CLS on page unload
    window.addEventListener('beforeunload', () => {
      console.log('CLS:', clsValue);
      trackPerformanceMetric('CLS', clsValue);
    });
  }
}

/**
 * Track performance metrics (placeholder for analytics)
 */
function trackPerformanceMetric(metric: string, value: number): void {
  // Example analytics call
  try {
    if (typeof (window as any).gtag !== 'undefined') {
      (window as any).gtag('event', 'performance_metric', {
        metric_name: metric,
        metric_value: Math.round(value),
        custom_map: {
          user_agent: navigator.userAgent,
          connection: (navigator as any).connection?.effectiveType || 'unknown'
        }
      });
    }
  } catch (error) {
    console.warn('Failed to track performance metric:', error);
  }
}

// Initialize everything when DOM is ready
async function bootstrap(): Promise<void> {
  // Register service worker first
  await registerServiceWorker();
  
  // Initialize analytics
  initializeAnalytics();
  
  // Initialize the main application
  await initializeApp();
}

// Start the application
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
