/**
 * StateManager - Centralized application state management
 * Provides reactive state updates and manages application-wide state
 */

import type { 
  AppState, 
  StateListener, 
  StateUpdate,
  UIState 
} from '../types/state.js';
import type { 
  Song, 
  ChartConfig 
} from '../types/core.js';
import type { 
  ValidationResult, 
  ValidationError 
} from '../types/validation.js';

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
    text: '#333333'
  }
};

/**
 * Default application state
 */
const DEFAULT_APP_STATE: AppState = {
  currentSong: null,
  inputText: '',
  validationResult: { isValid: true, errors: [], warnings: [] },
  chartConfig: DEFAULT_CHART_CONFIG,
  isLoading: false,
  errors: [],
  isExporting: false,
  lastUpdateTimestamp: new Date()
};

/**
 * Default UI state
 */
const DEFAULT_UI_STATE: UIState = {
  isMobile: false,
  isInputCollapsed: false,
  isPreviewCollapsed: false,
  canvasSize: {
    width: DEFAULT_CHART_CONFIG.canvasWidth,
    height: DEFAULT_CHART_CONFIG.canvasHeight
  }
};

/**
 * StateManager class for centralized state management
 */
export class StateManager {
  private appState: AppState;
  private uiState: UIState;
  private listeners: Set<StateListener>;
  private isUpdating: boolean = false;

  constructor(initialState?: Partial<AppState>) {
    this.appState = { ...DEFAULT_APP_STATE, ...initialState };
    this.uiState = { ...DEFAULT_UI_STATE };
    this.listeners = new Set();
    
    // Initialize responsive state
    this.updateResponsiveState();
    this.setupResizeListener();
  }

  /**
   * Get current application state (readonly)
   */
  getState(): Readonly<AppState> {
    return { ...this.appState };
  }

  /**
   * Get current UI state (readonly)
   */
  getUIState(): Readonly<UIState> {
    return { ...this.uiState };
  }

  /**
   * Update application state with partial updates
   */
  updateState(update: StateUpdate): void {
    if (this.isUpdating) {
      console.warn('StateManager: Recursive state update detected, ignoring');
      return;
    }

    this.isUpdating = true;
    
    try {
      const previousState = { ...this.appState };
      
      // Apply updates
      this.appState = {
        ...this.appState,
        ...update,
        lastUpdateTimestamp: new Date()
      };
      
      // Validate state consistency
      this.validateStateConsistency();
      
      // Notify listeners if state actually changed
      if (this.hasStateChanged(previousState, this.appState)) {
        this.notifyListeners();
      }
    } finally {
      this.isUpdating = false;
    }
  }

  /**
   * Update UI state
   */
  updateUIState(update: Partial<UIState>): void {
    const previousUIState = { ...this.uiState };
    this.uiState = { ...this.uiState, ...update };
    
    // Update canvas size in app state if it changed
    if (update.canvasSize && 
        (update.canvasSize.width !== previousUIState.canvasSize.width ||
         update.canvasSize.height !== previousUIState.canvasSize.height)) {
      this.updateState({
        chartConfig: {
          ...this.appState.chartConfig,
          canvasWidth: update.canvasSize.width,
          canvasHeight: update.canvasSize.height
        }
      });
    }
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Set current song and update related state
   */
  setSong(song: Song | null): void {
    this.updateState({
      currentSong: song,
      validationResult: song 
        ? { isValid: true, errors: [], warnings: [] }
        : { isValid: false, errors: [], warnings: [] },
      // If setting a song, also set input text from metadata if available
      inputText: song?.metadata?.originalInput || this.appState.inputText
    });
  }

  /**
   * Set input text
   */
  setInputText(text: string): void {
    this.updateState({ inputText: text });
  }

  /**
   * Set validation result
   */
  setValidationResult(result: ValidationResult): void {
    this.updateState({ 
      validationResult: result,
      // Clear current song if validation failed
      currentSong: result.isValid ? this.appState.currentSong : null
    });
  }

  /**
   * Add error to error list
   */
  addError(error: ValidationError): void {
    const errors = [...this.appState.errors, error];
    this.updateState({ errors });
  }

  /**
   * Clear all errors
   */
  clearErrors(): void {
    this.updateState({ errors: [] });
  }

  /**
   * Set loading state
   */
  setLoading(isLoading: boolean): void {
    this.updateState({ isLoading });
  }

  /**
   * Set exporting state
   */
  setExporting(isExporting: boolean): void {
    this.updateState({ isExporting });
  }

  /**
   * Update chart configuration
   */
  updateChartConfig(config: Partial<ChartConfig>): void {
    this.updateState({
      chartConfig: { ...this.appState.chartConfig, ...config }
    });
  }

  /**
   * Reset state to defaults
   */
  reset(): void {
    this.appState = { ...DEFAULT_APP_STATE };
    this.uiState = { ...DEFAULT_UI_STATE };
    this.updateResponsiveState();
    this.notifyListeners();
  }

  /**
   * Check if export is possible
   */
  canExport(): boolean {
    return this.appState.currentSong !== null && 
           !this.appState.isLoading && 
           !this.appState.isExporting;
  }

  /**
   * Update song (alias for setSong for test compatibility)
   */
  updateSong(song: Song | null): void {
    this.setSong(song);
  }

  /**
   * Get current song
   */
  getCurrentSong(): Song | null {
    return this.appState.currentSong;
  }

  /**
   * Update validation result (alias for setValidationResult for test compatibility)
   */
  updateValidationResult(result: ValidationResult): void {
    this.setValidationResult(result);
  }

  /**
   * Check if there are validation errors
   */
  hasErrors(): boolean {
    return !this.appState.validationResult.isValid || this.appState.errors.length > 0;
  }

  /**
   * Clear current song (alias for setSong(null) for test compatibility)
   */
  clearSong(): void {
    this.setSong(null);
  }

  /**
   * Get state summary for debugging
   */
  getStateSummary(): {
    hasSong: boolean;
    isValid: boolean;
    errorCount: number;
    textLength: number;
    isLoading: boolean;
    isExporting: boolean;
    isMobile: boolean;
  } {
    return {
      hasSong: this.appState.currentSong !== null,
      isValid: this.appState.validationResult.isValid,
      errorCount: this.appState.errors.length,
      textLength: this.appState.inputText.length,
      isLoading: this.appState.isLoading,
      isExporting: this.appState.isExporting,
      isMobile: this.uiState.isMobile
    };
  }

  /**
   * Validate state consistency
   */
  private validateStateConsistency(): void {
    // If validation failed, ensure no current song
    if (!this.appState.validationResult.isValid && this.appState.currentSong) {
      console.warn('StateManager: Inconsistent state - validation failed but song exists');
      this.appState.currentSong = null;
    }
    
    // Ensure canvas size matches chart config
    if (this.uiState.canvasSize.width !== this.appState.chartConfig.canvasWidth ||
        this.uiState.canvasSize.height !== this.appState.chartConfig.canvasHeight) {
      this.uiState.canvasSize = {
        width: this.appState.chartConfig.canvasWidth,
        height: this.appState.chartConfig.canvasHeight
      };
    }
  }

  /**
   * Check if state has actually changed
   */
  private hasStateChanged(previous: AppState, current: AppState): boolean {
    // Deep comparison for key state properties
    return (
      previous.currentSong !== current.currentSong ||
      previous.inputText !== current.inputText ||
      previous.validationResult !== current.validationResult ||
      previous.isLoading !== current.isLoading ||
      previous.isExporting !== current.isExporting ||
      previous.errors.length !== current.errors.length ||
      JSON.stringify(previous.chartConfig) !== JSON.stringify(current.chartConfig)
    );
  }

  /**
   * Notify all listeners of state changes
   */
  private notifyListeners(): void {
    const currentState = this.getState();
    
    this.listeners.forEach(listener => {
      try {
        listener(currentState);
      } catch (error) {
        console.error('StateManager: Error in state listener:', error);
      }
    });
  }

  /**
   * Update responsive state based on window size
   */
  private updateResponsiveState(): void {
    const isMobile = window.innerWidth < 768; // Standard mobile breakpoint
    
    if (this.uiState.isMobile !== isMobile) {
      this.updateUIState({ isMobile });
    }
  }

  /**
   * Set up window resize listener for responsive state
   */
  private setupResizeListener(): void {
    let resizeTimeout: ReturnType<typeof setTimeout>;
    
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        this.updateResponsiveState();
      }, 150);
    };
    
    window.addEventListener('resize', handleResize);
  }

  /**
   * Destroy the state manager and clean up
   */
  destroy(): void {
    this.listeners.clear();
    // Note: We don't remove the resize listener as it's shared across the app
  }
}

/**
 * Default singleton instance
 */
export const stateManager = new StateManager();