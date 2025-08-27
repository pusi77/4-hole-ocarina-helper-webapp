/**
 * UIController - Main application controller that orchestrates all components
 * Manages component interactions, event handling, and application lifecycle
 */

import type { 
  Song, 
  ChartConfig 
} from '../types/core.js';
import type { 
  ValidationResult, 
  ValidationError,
  ExampleSong 
} from '../types/index.js';
import { StateManager } from './StateManager.js';
import { InputManager, type InputManagerEvents } from './InputManager.js';
import { RealTimeApp, type RealTimeAppEvents } from './RealTimeApp.js';
import { ExportManager } from './ExportManager.js';
import { ErrorHandlingManager } from './ErrorHandlingManager.js';
import { NotificationSystem } from './NotificationSystem.js';
import { LoadingManager, LoadingUtils } from './LoadingManager.js';
import { globalMemoryMonitor, MemoryUtils } from '../utils/MemoryMonitor.js';
import { globalPerformanceTester } from '../utils/PerformanceTester.js';

/**
 * Configuration for the UI Controller
 */
interface UIControllerConfig {
  enableRealTimePreview?: boolean;
  enableFileUpload?: boolean;
  enableExamples?: boolean;
  enableExport?: boolean;
  enableNotifications?: boolean;
  enableErrorRecovery?: boolean;
  debounceDelay?: number;
  maxFileSize?: number;
}

/**
 * DOM element references for initialization
 */
interface UIElements {
  // Input elements
  textArea: HTMLTextAreaElement;
  fileInput?: HTMLInputElement;
  dropZone?: HTMLElement;
  exampleContainer?: HTMLElement;
  
  // Preview elements
  canvas: HTMLCanvasElement;
  previewContainer?: HTMLElement;
  
  // Control elements
  exportButton?: HTMLButtonElement;
  clearButton?: HTMLButtonElement;
  
  // Notification elements
  notificationContainer?: HTMLElement;
  errorContainer?: HTMLElement;
}

/**
 * Event handlers for external integration
 */
export interface UIControllerEvents {
  onReady?: () => void;
  onSongChanged?: (song: Song | null) => void;
  onValidationChanged?: (result: ValidationResult) => void;
  onError?: (error: ValidationError) => void;
  onExportStarted?: () => void;
  onExportCompleted?: (filename: string) => void;
  onExampleLoaded?: (example: ExampleSong) => void;
}

/**
 * Main UI Controller class
 */
export class UIController {
  private stateManager: StateManager;
  private inputManager: InputManager | null = null;
  private realTimeApp: RealTimeApp | null = null;
  private exportManager: ExportManager | null = null;
  private errorManager: ErrorHandlingManager | null = null;
  private notificationSystem: NotificationSystem | null = null;
  private loadingManager: LoadingManager | null = null;
  
  private config: UIControllerConfig;
  private events: UIControllerEvents;
  private elements: UIElements;
  private isInitialized: boolean = false;

  constructor(
    elements: UIElements,
    events: UIControllerEvents = {},
    config: UIControllerConfig = {}
  ) {
    this.elements = elements;
    this.events = events;
    this.config = {
      enableRealTimePreview: true,
      enableFileUpload: true,
      enableExamples: true,
      enableExport: true,
      enableNotifications: true,
      enableErrorRecovery: true,
      debounceDelay: 300,
      maxFileSize: 1024 * 1024, // 1MB
      ...config
    };
    
    // Create state manager
    this.stateManager = new StateManager();
    
    // Subscribe to state changes
    this.stateManager.subscribe(this.handleStateChange.bind(this));
  }

  /**
   * Initialize the UI Controller and all components
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.warn('UIController: Already initialized');
      return;
    }

    try {
      // Initialize core components
      await this.initializeComponents();
      
      // Set up component connections
      this.connectComponents();
      
      // Set up event handlers
      this.setupEventHandlers();
      
      // Initialize responsive behavior
      this.setupResponsiveBehavior();
      
      this.isInitialized = true;
      
      // Notify that the controller is ready
      if (this.events.onReady) {
        this.events.onReady();
      }
      
      console.log('UIController: Initialization complete');
    } catch (error) {
      console.error('UIController: Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Initialize all components
   */
  private async initializeComponents(): Promise<void> {
    // Initialize loading manager
    this.loadingManager = new LoadingManager({
      onLoadingStart: (state) => {
        console.log(`Loading started: ${state.operation}`);
      },
      onLoadingComplete: (state) => {
        console.log(`Loading completed: ${state.operation} in ${(performance.now() - state.startTime).toFixed(1)}ms`);
      }
    });

    // Initialize notification system first (other components may need it)
    if (this.config.enableNotifications && this.elements.notificationContainer) {
      this.notificationSystem = new NotificationSystem(this.elements.notificationContainer);
    }

    // Start memory monitoring
    globalMemoryMonitor.startMonitoring(5000); // Check every 5 seconds
    
    // Register memory cleanup callback
    globalMemoryMonitor.registerCleanupCallback(() => {
      this.performMemoryCleanup();
    });

    // Initialize error handling
    if (this.config.enableErrorRecovery && this.elements.errorContainer) {
      this.errorManager = new ErrorHandlingManager(
        this.elements.errorContainer,
        {
          enableRecovery: true,
          showSuggestions: true,
          enableErrorHighlighting: true
        }
      );
    }

    // Initialize real-time app (core functionality)
    if (this.config.enableRealTimePreview) {
      const realTimeEvents: RealTimeAppEvents = {
        onSongChanged: this.handleSongChanged.bind(this),
        onValidationChanged: this.handleValidationChanged.bind(this),
        onError: this.handleError.bind(this),
        onTextChanged: this.handleTextChanged.bind(this)
      };

      this.realTimeApp = new RealTimeApp(
        this.elements.textArea,
        this.elements.canvas,
        realTimeEvents,
        {
          textInputConfig: {
            debounceDelay: this.config.debounceDelay,
            showValidationErrors: true,
            highlightErrors: true
          }
        }
      );
    }

    // Initialize input manager for file handling
    if (this.config.enableFileUpload) {
      const inputEvents: InputManagerEvents = {
        onFileLoaded: this.handleFileLoaded.bind(this),
        onTextInput: this.handleTextInput.bind(this),
        onValidationResult: this.handleValidationResult.bind(this),
        onError: this.handleInputError.bind(this),
        onExampleLoaded: this.handleExampleLoaded.bind(this),
        onExampleSelected: this.handleExampleSelected.bind(this)
      };

      this.inputManager = new InputManager(inputEvents, {
        maxFileSize: this.config.maxFileSize,
        allowMultiple: false
      });

      // Initialize input manager with DOM elements
      this.inputManager.initialize({
        dropZone: this.elements.dropZone,
        fileInput: this.elements.fileInput,
        textArea: this.elements.textArea,
        exampleContainer: this.elements.exampleContainer
      });
    }

    // Initialize export manager
    if (this.config.enableExport && this.elements.exportButton) {
      this.exportManager = new ExportManager(
        this.elements.canvas,
        {
          onExportStarted: this.handleExportStarted.bind(this),
          onExportCompleted: this.handleExportCompleted.bind(this),
          onExportError: this.handleExportError.bind(this)
        }
      );
    }
  }

  /**
   * Connect components and set up inter-component communication
   */
  private connectComponents(): void {
    // Connect export button to export manager
    if (this.exportManager && this.elements.exportButton) {
      this.elements.exportButton.addEventListener('click', () => {
        this.handleExportRequest();
      });
    }

    // Connect clear button
    if (this.elements.clearButton) {
      this.elements.clearButton.addEventListener('click', () => {
        this.handleClearRequest();
      });
    }

    // Set up keyboard shortcuts
    this.setupKeyboardShortcuts();
  }

  /**
   * Set up global event handlers
   */
  private setupEventHandlers(): void {
    // Handle unhandled errors
    window.addEventListener('error', (event) => {
      this.handleGlobalError(event.error);
    });

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.handleGlobalError(event.reason);
    });

    // Handle visibility changes (for performance optimization)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // App is hidden, pause non-essential operations
        this.pauseNonEssentialOperations();
      } else {
        // App is visible, resume operations
        this.resumeOperations();
      }
    });
  }

  /**
   * Set up responsive behavior
   */
  private setupResponsiveBehavior(): void {
    // Initial responsive state update
    this.updateResponsiveLayout();

    // Listen for resize events
    let resizeTimeout: ReturnType<typeof setTimeout>;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        this.updateResponsiveLayout();
      }, 150);
    });
  }

  /**
   * Set up keyboard shortcuts
   */
  private setupKeyboardShortcuts(): void {
    document.addEventListener('keydown', (event) => {
      // Ctrl+S or Cmd+S for export
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        this.handleExportRequest();
      }

      // Ctrl+L or Cmd+L for clear
      if ((event.ctrlKey || event.metaKey) && event.key === 'l') {
        event.preventDefault();
        this.handleClearRequest();
      }

      // Escape to clear errors
      if (event.key === 'Escape') {
        this.stateManager.clearErrors();
      }
    });
  }

  /**
   * Handle state changes from StateManager
   */
  private handleStateChange(state: Readonly<import('../types/state.js').AppState>): void {
    // Update export button state
    if (this.elements.exportButton) {
      this.elements.exportButton.disabled = !this.stateManager.canExport();
    }

    // Update loading states
    if (state.isLoading || state.isExporting) {
      document.body.classList.add('loading');
    } else {
      document.body.classList.remove('loading');
    }

    // Handle errors
    if (state.errors.length > 0 && this.errorManager) {
      state.errors.forEach(error => {
        this.errorManager!.displayError(error);
      });
    }
  }

  /**
   * Handle song changes from real-time app
   */
  private handleSongChanged(song: Song | null): void {
    // Check memory usage for large songs
    if (song && MemoryUtils.isSongTooLarge(song)) {
      const recommendations = MemoryUtils.getSongProcessingRecommendations(song);
      console.warn('Large song detected:', recommendations);
      
      if (this.notificationSystem) {
        this.notificationSystem.showWarning('Large Song', 'This song may impact performance. Consider reducing complexity.');
      }
    }

    this.stateManager.setSong(song);
    
    if (this.events.onSongChanged) {
      this.events.onSongChanged(song);
    }
  }

  /**
   * Handle validation changes
   */
  private handleValidationChanged(result: ValidationResult): void {
    this.stateManager.setValidationResult(result);
    
    if (this.events.onValidationChanged) {
      this.events.onValidationChanged(result);
    }
  }

  /**
   * Handle text changes
   */
  private handleTextChanged(text: string): void {
    this.stateManager.setInputText(text);
  }

  /**
   * Handle file loaded from InputManager
   */
  private handleFileLoaded(content: string, filename: string): void {
    // Show loading state for file processing
    LoadingUtils.showFileLoading(filename);
    
    try {
      if (this.realTimeApp) {
        this.realTimeApp.setText(content);
      }
      
      LoadingUtils.hide();
      
      if (this.notificationSystem) {
        this.notificationSystem.showSuccess('File Loaded', `"${filename}" loaded successfully`);
      }
    } catch (error) {
      LoadingUtils.error(error as Error);
      throw error;
    }
  }

  /**
   * Handle text input from InputManager
   */
  private handleTextInput(text: string): void {
    if (this.realTimeApp) {
      this.realTimeApp.setText(text);
    }
  }

  /**
   * Handle validation result from InputManager
   */
  private handleValidationResult(result: ValidationResult): void {
    this.handleValidationChanged(result);
  }

  /**
   * Handle input errors from InputManager
   */
  private handleInputError(error: ValidationError): void {
    this.handleError(error);
  }

  /**
   * Handle example loaded
   */
  private handleExampleLoaded(notation: string, title: string): void {
    if (this.realTimeApp) {
      this.realTimeApp.setText(notation);
    }
    
    if (this.notificationSystem) {
      this.notificationSystem.showInfo(`Example "${title}" loaded`);
    }
  }

  /**
   * Handle example selected
   */
  private handleExampleSelected(example: ExampleSong): void {
    if (this.events.onExampleLoaded) {
      this.events.onExampleLoaded(example);
    }
  }

  /**
   * Handle errors
   */
  private handleError(error: ValidationError): void {
    this.stateManager.addError(error);
    
    if (this.errorManager) {
      this.errorManager.displayError(error);
    }
    
    if (this.events.onError) {
      this.events.onError(error);
    }
  }

  /**
   * Handle export requests
   */
  private handleExportRequest(): void {
    if (!this.stateManager.canExport()) {
      if (this.notificationSystem) {
        this.notificationSystem.showWarning('No chart available to export');
      }
      return;
    }

    if (this.exportManager && this.realTimeApp) {
      const song = this.stateManager.getState().currentSong;
      const filename = song ? `${song.title.toLowerCase().replace(/\s+/g, '-')}.png` : undefined;
      
      this.exportManager.exportChart(filename);
    }
  }

  /**
   * Handle clear requests
   */
  private handleClearRequest(): void {
    if (this.realTimeApp) {
      this.realTimeApp.clear();
    }
    
    if (this.inputManager) {
      this.inputManager.clear();
    }
    
    this.stateManager.clearErrors();
    
    if (this.notificationSystem) {
      this.notificationSystem.showInfo('Content cleared');
    }
  }

  /**
   * Handle export started
   */
  private handleExportStarted(): void {
    this.stateManager.setExporting(true);
    
    if (this.events.onExportStarted) {
      this.events.onExportStarted();
    }
  }

  /**
   * Handle export completed
   */
  private handleExportCompleted(filename: string): void {
    this.stateManager.setExporting(false);
    
    if (this.notificationSystem) {
      this.notificationSystem.showSuccess(`Chart exported as "${filename}"`);
    }
    
    if (this.events.onExportCompleted) {
      this.events.onExportCompleted(filename);
    }
  }

  /**
   * Handle export errors
   */
  private handleExportError(error: Error): void {
    this.stateManager.setExporting(false);
    
    const validationError: ValidationError = {
      type: 'export_error' as any,
      message: `Export failed: ${error.message}`,
      suggestions: ['Try again', 'Check if chart is properly rendered']
    };
    
    this.handleError(validationError);
  }

  /**
   * Handle global errors
   */
  private handleGlobalError(error: any): void {
    console.error('UIController: Global error:', error);
    
    const validationError: ValidationError = {
      type: 'parsing_error' as any,
      message: `Unexpected error: ${error?.message || 'Unknown error'}`,
      suggestions: ['Refresh the page', 'Try a different input']
    };
    
    this.handleError(validationError);
  }

  /**
   * Update responsive layout
   */
  private updateResponsiveLayout(): void {
    const isMobile = window.innerWidth < 768;
    
    // Update state manager
    this.stateManager.updateUIState({ isMobile });
    
    // Update DOM classes for CSS styling
    if (isMobile) {
      document.body.classList.add('mobile-layout');
      document.body.classList.remove('desktop-layout');
    } else {
      document.body.classList.add('desktop-layout');
      document.body.classList.remove('mobile-layout');
    }
  }

  /**
   * Pause non-essential operations when app is hidden
   */
  private pauseNonEssentialOperations(): void {
    // Could pause animations, reduce update frequency, etc.
    console.log('UIController: Pausing non-essential operations');
  }

  /**
   * Resume operations when app becomes visible
   */
  private resumeOperations(): void {
    // Resume normal operations
    console.log('UIController: Resuming operations');
  }

  // Public API methods

  /**
   * Set text content programmatically
   */
  public setText(text: string): void {
    if (this.realTimeApp) {
      this.realTimeApp.setText(text);
    }
  }

  /**
   * Get current text content
   */
  public getText(): string {
    return this.realTimeApp?.getText() || '';
  }

  /**
   * Load an example by ID
   */
  public loadExample(exampleId: string): void {
    if (this.inputManager) {
      this.inputManager.loadExample(exampleId);
    }
  }

  /**
   * Clear all content
   */
  public clear(): void {
    this.handleClearRequest();
  }

  /**
   * Export current chart
   */
  public export(filename?: string): void {
    if (this.exportManager && this.stateManager.canExport()) {
      this.exportManager.exportChart(filename);
    }
  }

  /**
   * Get current application state
   */
  public getState(): Readonly<import('../types/state.js').AppState> {
    return this.stateManager.getState();
  }

  /**
   * Get state summary for debugging
   */
  public getStateSummary(): ReturnType<StateManager['getStateSummary']> {
    return this.stateManager.getStateSummary();
  }

  /**
   * Update chart configuration
   */
  public updateChartConfig(config: Partial<ChartConfig>): void {
    this.stateManager.updateChartConfig(config);
    
    if (this.realTimeApp) {
      this.realTimeApp.updateChartConfig(config);
    }
  }

  /**
   * Check if the controller is initialized
   */
  public isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Perform memory cleanup
   */
  private performMemoryCleanup(): void {
    console.log('UIController: Performing memory cleanup');
    
    // Clear caches in components
    if (this.realTimeApp) {
      // Clear any cached data in real-time app
      (this.realTimeApp as any).clearCache?.();
    }
    
    // Clear state manager caches
    this.stateManager.clearErrors();
    
    // Force garbage collection if available
    if ((window as any).gc) {
      (window as any).gc();
    }
    
    if (this.notificationSystem) {
      this.notificationSystem.showInfo('Memory Cleanup', 'Memory cleanup completed');
    }
  }

  /**
   * Run performance tests
   */
  public async runPerformanceTests(): Promise<void> {
    if (this.loadingManager) {
      this.loadingManager.startLoading('performance-test', 'Running performance tests...', 10000);
    }
    
    try {
      const results = await globalPerformanceTester.runAllTests();
      const report = globalPerformanceTester.generateReport();
      
      console.log('Performance Test Results:', report);
      
      if (this.loadingManager) {
        this.loadingManager.endLoading();
      }
      
      if (this.notificationSystem) {
        const passedTests = results.filter(r => r.passed).length;
        const totalTests = results.length;
        this.notificationSystem.showInfo(
          'Performance Tests Complete', 
          `${passedTests}/${totalTests} tests passed`
        );
      }
    } catch (error) {
      if (this.loadingManager) {
        this.loadingManager.handleError(error as Error);
      }
      throw error;
    }
  }

  /**
   * Get performance metrics
   */
  public getPerformanceMetrics(): {
    memory: ReturnType<typeof globalMemoryMonitor.getMemoryStats>;
    testResults: ReturnType<typeof globalPerformanceTester.getResults>;
  } {
    return {
      memory: globalMemoryMonitor.getMemoryStats(),
      testResults: globalPerformanceTester.getResults()
    };
  }

  /**
   * Destroy the controller and clean up all components
   */
  public destroy(): void {
    // Stop performance monitoring
    globalMemoryMonitor.stopMonitoring();
    
    // Clean up components
    if (this.inputManager) {
      this.inputManager.destroy();
    }
    
    if (this.realTimeApp) {
      this.realTimeApp.destroy();
    }
    
    if (this.exportManager) {
      this.exportManager.destroy();
    }
    
    if (this.errorManager) {
      this.errorManager.destroy();
    }
    
    if (this.notificationSystem) {
      this.notificationSystem.destroy();
    }
    
    if (this.loadingManager) {
      this.loadingManager.destroy();
    }
    
    if (this.stateManager) {
      this.stateManager.destroy();
    }
    
    // Remove event listeners
    // (Most are cleaned up by individual components)
    
    this.isInitialized = false;
    
    console.log('UIController: Destroyed');
  }
}