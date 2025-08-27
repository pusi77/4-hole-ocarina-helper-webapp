/**
 * ErrorHandlingManager - Central coordinator for comprehensive error handling
 * Integrates notification system, error highlighting, and error recovery
 */

import type { 
  ValidationError, 
  ValidationWarning, 
  ValidationResult, 
  AppState 
} from '../types/index.js';
import { ErrorType, WarningType } from '../types/index.js';
import { NotificationSystem, type NotificationEvents, type NotificationConfig } from './NotificationSystem.js';
import { ErrorHighlighter, type ErrorHighlighterEvents, type HighlightConfig } from './ErrorHighlighter.js';
import { ErrorRecoverySystem, type ErrorRecoveryEvents, type ErrorRecoveryConfig } from './ErrorRecoverySystem.js';

/**
 * Configuration for the error handling manager
 */
export interface ErrorHandlingConfig {
  notifications?: Partial<NotificationConfig>;
  highlighting?: Partial<HighlightConfig>;
  recovery?: Partial<ErrorRecoveryConfig>;
  enableSuccessNotifications?: boolean;
  enableWarningNotifications?: boolean;
  enableErrorRecovery?: boolean;
  enableStatePreservation?: boolean;
}

/**
 * Event handlers for error handling manager
 */
export interface ErrorHandlingEvents {
  onErrorHandled?: (error: ValidationError, recovered: boolean) => void;
  onWarningHandled?: (warning: ValidationWarning) => void;
  onSuccessNotification?: (title: string, message: string) => void;
  onStateRecovered?: (previousState: Partial<AppState>, newState: Partial<AppState>) => void;
  onRecoveryFailed?: (error: ValidationError, attempts: number) => void;
  onValidationImproved?: (previousResult: ValidationResult, newResult: ValidationResult) => void;
}

/**
 * Error handling statistics
 */
export interface ErrorHandlingStats {
  totalErrors: number;
  totalWarnings: number;
  totalRecoveries: number;
  successfulRecoveries: number;
  failedRecoveries: number;
  averageRecoveryTime: number;
  mostCommonErrorType: ErrorType | null;
  mostCommonWarningType: WarningType | null;
}

/**
 * ErrorHandlingManager coordinates all error handling systems
 */
export class ErrorHandlingManager {
  private notificationSystem: NotificationSystem;
  private errorHighlighter: ErrorHighlighter | null = null;
  private errorRecoverySystem: ErrorRecoverySystem;
  private config: ErrorHandlingConfig;
  private events: ErrorHandlingEvents;
  private stats: ErrorHandlingStats;
  private lastValidationResult: ValidationResult | null = null;
  private currentState: Partial<AppState> | null = null;
  private currentInputText: string = '';
  // Note: currentInputText is used for state tracking and recovery

  constructor(
    events: ErrorHandlingEvents = {},
    config: ErrorHandlingConfig = {}
  ) {
    this.events = events;
    this.config = {
      enableSuccessNotifications: true,
      enableWarningNotifications: true,
      enableErrorRecovery: true,
      enableStatePreservation: true,
      ...config
    };

    this.stats = this.initializeStats();

    // Initialize notification system
    const notificationEvents: NotificationEvents = {
      onNotificationAdded: (notification) => {
        console.log('Notification added:', notification.title);
      },
      onNotificationRemoved: (notificationId) => {
        console.log('Notification removed:', notificationId);
      }
    };

    this.notificationSystem = new NotificationSystem(
      notificationEvents,
      this.config.notifications
    );

    // Initialize error recovery system
    const recoveryEvents: ErrorRecoveryEvents = {
      onRecoveryAttempted: (attempt) => {
        console.log('Recovery attempted:', attempt.strategy, attempt.description);
      },
      onRecoverySucceeded: (attempt, newState) => {
        this.handleRecoverySuccess(attempt, newState);
      },
      onRecoveryFailed: (attempt) => {
        this.handleRecoveryFailure(attempt);
      },
      onStateBackedUp: (backup) => {
        console.log('State backed up:', backup.id, backup.description);
      },
      onErrorBoundaryTriggered: (error, context) => {
        this.handleUnexpectedError(error, context);
      }
    };

    this.errorRecoverySystem = new ErrorRecoverySystem(
      recoveryEvents,
      this.config.recovery
    );
  }

  /**
   * Initialize the error handling manager with DOM elements
   */
  initialize(elements: {
    notificationContainer: HTMLElement;
    textArea?: HTMLTextAreaElement;
  }): void {
    // Initialize notification system
    this.notificationSystem.initialize(elements.notificationContainer);

    // Initialize error highlighter if text area provided
    if (elements.textArea) {
      this.setupErrorHighlighter(elements.textArea);
    }
  }

  /**
   * Handle validation result with comprehensive error handling
   */
  async handleValidationResult(
    validationResult: ValidationResult,
    currentState: Partial<AppState>,
    inputText: string
  ): Promise<{ 
    handled: boolean; 
    recovered: boolean; 
    newState?: Partial<AppState>; 
    newInputText?: string 
  }> {
    
    // Update current state tracking
    this.currentState = currentState;
    this.currentInputText = inputText;

    // Clear previous error notifications
    this.notificationSystem.clearErrors();

    // Update error highlighting
    if (this.errorHighlighter) {
      this.errorHighlighter.updateHighlights(validationResult);
    }

    // Handle errors
    let recovered = false;
    let newState = currentState;
    let newInputText = inputText;

    if (!validationResult.isValid && validationResult.errors.length > 0) {
      const recoveryResult = await this.handleErrors(
        validationResult.errors,
        currentState,
        inputText
      );
      
      recovered = recoveryResult.recovered;
      if (recovered) {
        newState = recoveryResult.newState || currentState;
        newInputText = recoveryResult.newInputText || inputText;
      }
    }

    // Handle warnings
    if (validationResult.warnings.length > 0) {
      this.handleWarnings(validationResult.warnings);
    }

    // Show success notification if validation improved
    if (this.lastValidationResult && this.hasValidationImproved(this.lastValidationResult, validationResult)) {
      this.showValidationImprovement(this.lastValidationResult, validationResult);
    }

    // Backup state if valid and state preservation is enabled
    if (this.config.enableStatePreservation && validationResult.isValid) {
      this.errorRecoverySystem.backupState(
        newState,
        newInputText,
        true,
        'Valid state after successful validation'
      );
    }

    // Update statistics
    this.updateStats(validationResult);

    // Store last validation result
    this.lastValidationResult = validationResult;

    return {
      handled: true,
      recovered,
      newState: recovered ? newState : undefined,
      newInputText: recovered ? newInputText : undefined
    };
  }

  /**
   * Handle individual error with recovery attempt
   */
  async handleError(
    error: ValidationError,
    currentState: Partial<AppState>,
    inputText: string
  ): Promise<{ handled: boolean; recovered: boolean; newState?: Partial<AppState>; newInputText?: string }> {
    
    // Show error notification
    const notificationId = this.notificationSystem.showError(error);

    // Attempt recovery if enabled
    let recovered = false;
    let newState = currentState;
    let newInputText = inputText;

    if (this.config.enableErrorRecovery) {
      const recoveryResult = await this.errorRecoverySystem.attemptRecovery(
        error,
        currentState,
        inputText
      );

      if (recoveryResult.success) {
        recovered = true;
        newState = recoveryResult.newState || currentState;
        newInputText = recoveryResult.newInputText || inputText;

        // Show recovery success notification
        this.showRecoverySuccess(error, recoveryResult);
        
        // Hide the original error notification
        this.notificationSystem.hide(notificationId);
      }
    }

    // Trigger event
    if (this.events.onErrorHandled) {
      this.events.onErrorHandled(error, recovered);
    }

    return { handled: true, recovered, newState, newInputText };
  }

  /**
   * Handle multiple errors
   */
  private async handleErrors(
    errors: ValidationError[],
    currentState: Partial<AppState>,
    inputText: string
  ): Promise<{ recovered: boolean; newState?: Partial<AppState>; newInputText?: string }> {
    
    // Try to recover from the first critical error
    const criticalError = errors.find(e => this.isCriticalError(e)) || errors[0];
    
    const result = await this.handleError(criticalError, currentState, inputText);
    
    // Show remaining errors if recovery didn't fix everything
    if (!result.recovered || errors.length > 1) {
      errors.forEach(error => {
        if (error !== criticalError) {
          this.notificationSystem.showError(error);
        }
      });
    }

    return {
      recovered: result.recovered,
      newState: result.newState,
      newInputText: result.newInputText
    };
  }

  /**
   * Handle warnings
   */
  private handleWarnings(warnings: ValidationWarning[]): void {
    if (!this.config.enableWarningNotifications) return;

    warnings.forEach(warning => {
      this.notificationSystem.showWarning(warning);
      
      if (this.events.onWarningHandled) {
        this.events.onWarningHandled(warning);
      }
    });
  }

  /**
   * Show success notification
   */
  showSuccess(title: string, message: string, options?: { autoHide?: boolean; hideDelay?: number }): void {
    if (!this.config.enableSuccessNotifications) return;

    this.notificationSystem.showSuccess(title, message, options);
    
    if (this.events.onSuccessNotification) {
      this.events.onSuccessNotification(title, message);
    }
  }

  /**
   * Show info notification
   */
  showInfo(title: string, message: string, options?: { autoHide?: boolean; hideDelay?: number }): void {
    this.notificationSystem.showInfo(title, message, options);
  }

  /**
   * Handle note conversion success
   */
  handleNoteConversion(originalNote: string, convertedNote: string, count: number = 1): void {
    const title = 'Notes Converted';
    const message = count === 1 
      ? `Converted '${originalNote}' to '${convertedNote}'`
      : `Converted ${count} instances of '${originalNote}' to '${convertedNote}'`;
    
    this.showSuccess(title, message, { autoHide: true, hideDelay: 3000 });
  }

  /**
   * Handle export success
   */
  handleExportSuccess(filename: string, size: number): void {
    const title = 'Export Successful';
    const message = `Chart exported as "${filename}" (${this.formatFileSize(size)})`;
    
    this.showSuccess(title, message, { autoHide: true, hideDelay: 4000 });
  }

  /**
   * Handle file upload success
   */
  handleFileUploadSuccess(filename: string, lineCount: number): void {
    const title = 'File Loaded';
    const message = `Successfully loaded "${filename}" (${lineCount} lines)`;
    
    this.showSuccess(title, message, { autoHide: true, hideDelay: 3000 });
  }

  /**
   * Get current error handling statistics
   */
  getStats(): ErrorHandlingStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = this.initializeStats();
  }

  /**
   * Get current state backups
   */
  getStateBackups() {
    return this.errorRecoverySystem.getStateBackups();
  }

  /**
   * Restore state from backup
   */
  restoreStateFromBackup(backupId: string): { success: boolean; state?: Partial<AppState>; inputText?: string } {
    return this.errorRecoverySystem.restoreState(backupId);
  }

  /**
   * Clear all error notifications
   */
  clearErrors(): void {
    this.notificationSystem.clearErrors();
  }

  /**
   * Clear all notifications
   */
  clearAllNotifications(): void {
    this.notificationSystem.hideAll();
  }

  /**
   * Check if there are any active errors
   */
  hasActiveErrors(): boolean {
    return this.notificationSystem.hasErrors() || 
           (this.errorHighlighter?.hasErrors() ?? false);
  }

  /**
   * Set up error highlighter
   */
  private setupErrorHighlighter(textArea: HTMLTextAreaElement): void {
    const highlighterEvents: ErrorHighlighterEvents = {
      onHighlightClick: (highlight) => {
        // Show detailed error information
        this.showInfo(
          `Line ${highlight.lineNumber} ${highlight.type}`,
          highlight.message + (highlight.suggestions ? '\n\nSuggestions:\n• ' + highlight.suggestions.join('\n• ') : ''),
          { autoHide: false }
        );
      }
    };

    this.errorHighlighter = new ErrorHighlighter(
      textArea,
      highlighterEvents,
      this.config.highlighting
    );
  }

  /**
   * Handle recovery success
   */
  private handleRecoverySuccess(attempt: any, newState: Partial<AppState>): void {
    this.stats.successfulRecoveries++;
    
    this.showSuccess(
      'Auto-Recovery Successful',
      `${attempt.description} completed successfully`,
      { autoHide: true, hideDelay: 4000 }
    );

    if (this.events.onStateRecovered && this.currentState) {
      this.events.onStateRecovered(this.currentState, newState);
    }
  }

  /**
   * Handle recovery failure
   */
  private handleRecoveryFailure(attempt: any): void {
    this.stats.failedRecoveries++;
    
    if (this.events.onRecoveryFailed) {
      this.events.onRecoveryFailed(attempt.error, this.stats.failedRecoveries);
    }
  }

  /**
   * Handle unexpected errors
   */
  private handleUnexpectedError(error: Error, context: string): void {
    console.error('Unexpected error:', error, 'Context:', context);
    
    this.notificationSystem.show({
      type: 'error' as any,
      title: 'Unexpected Error',
      message: `An unexpected error occurred: ${error.message}`,
      autoHide: false,
      actions: [{
        label: 'Reload Page',
        action: () => window.location.reload(),
        style: 'primary'
      }]
    });
  }

  /**
   * Show recovery success notification
   */
  private showRecoverySuccess(error: ValidationError, _recoveryResult: any): void {
    this.showSuccess(
      'Problem Fixed',
      `Automatically resolved: ${error.message}`,
      { autoHide: true, hideDelay: 5000 }
    );
  }

  /**
   * Check if validation has improved
   */
  private hasValidationImproved(previous: ValidationResult, current: ValidationResult): boolean {
    if (!previous.isValid && current.isValid) return true;
    if (previous.errors.length > current.errors.length) return true;
    if (previous.warnings.length > current.warnings.length) return true;
    return false;
  }

  /**
   * Show validation improvement notification
   */
  private showValidationImprovement(previous: ValidationResult, current: ValidationResult): void {
    if (!previous.isValid && current.isValid) {
      this.showSuccess(
        'Validation Passed',
        'All errors have been resolved!',
        { autoHide: true, hideDelay: 3000 }
      );
    } else if (previous.errors.length > current.errors.length) {
      const fixed = previous.errors.length - current.errors.length;
      this.showSuccess(
        'Errors Reduced',
        `Fixed ${fixed} error${fixed > 1 ? 's' : ''}`,
        { autoHide: true, hideDelay: 3000 }
      );
    }

    if (this.events.onValidationImproved) {
      this.events.onValidationImproved(previous, current);
    }
  }

  /**
   * Check if error is critical
   */
  private isCriticalError(error: ValidationError): boolean {
    return [
      ErrorType.EMPTY_INPUT,
      ErrorType.INVALID_FILE_TYPE,
      ErrorType.RENDERING_ERROR
    ].includes(error.type);
  }

  /**
   * Update statistics
   */
  private updateStats(validationResult: ValidationResult): void {
    this.stats.totalErrors += validationResult.errors.length;
    this.stats.totalWarnings += validationResult.warnings.length;

    // Update most common error type
    if (validationResult.errors.length > 0) {
      const errorTypes = validationResult.errors.map(e => e.type);
      this.stats.mostCommonErrorType = this.getMostCommon(errorTypes);
    }

    // Update most common warning type
    if (validationResult.warnings.length > 0) {
      const warningTypes = validationResult.warnings.map(w => w.type);
      this.stats.mostCommonWarningType = this.getMostCommon(warningTypes);
    }
  }

  /**
   * Get most common item from array
   */
  private getMostCommon<T>(items: T[]): T | null {
    if (items.length === 0) return null;
    
    const counts = new Map<T, number>();
    items.forEach(item => {
      counts.set(item, (counts.get(item) || 0) + 1);
    });

    let mostCommon = items[0];
    let maxCount = 0;
    
    counts.forEach((count, item) => {
      if (count > maxCount) {
        maxCount = count;
        mostCommon = item;
      }
    });

    return mostCommon;
  }

  /**
   * Initialize statistics
   */
  private initializeStats(): ErrorHandlingStats {
    return {
      totalErrors: 0,
      totalWarnings: 0,
      totalRecoveries: 0,
      successfulRecoveries: 0,
      failedRecoveries: 0,
      averageRecoveryTime: 0,
      mostCommonErrorType: null,
      mostCommonWarningType: null
    };
  }

  /**
   * Format file size for display
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ErrorHandlingConfig>): void {
    this.config = { ...this.config, ...config };
    
    if (config.notifications) {
      this.notificationSystem.updateConfig(config.notifications);
    }
    
    if (config.highlighting && this.errorHighlighter) {
      this.errorHighlighter.updateConfig(config.highlighting);
    }
    
    if (config.recovery) {
      this.errorRecoverySystem.updateConfig(config.recovery);
    }
  }

  /**
   * Destroy the error handling manager and clean up
   */
  destroy(): void {
    this.notificationSystem.destroy();
    
    if (this.errorHighlighter) {
      this.errorHighlighter.destroy();
    }
    
    this.errorRecoverySystem.destroy();
    
    // Clear references
    this.currentState = null;
    this.lastValidationResult = null;
  }
}