/**
 * ErrorRecoverySystem - Handles graceful error recovery and state preservation
 * Provides automatic recovery, state backup/restore, and error boundary functionality
 */

import type { 
  ValidationError, 
  AppState 
} from '../types/index.js';
import { ErrorType } from '../types/index.js';

/**
 * Configuration for error recovery behavior
 */
export interface ErrorRecoveryConfig {
  enableAutoRecovery: boolean;
  enableStateBackup: boolean;
  maxRecoveryAttempts: number;
  backupInterval: number; // in milliseconds
  maxBackupHistory: number;
  enableErrorBoundary: boolean;
  fallbackToLastValidState: boolean;
}

/**
 * State backup entry
 */
export interface StateBackup {
  id: string;
  timestamp: Date;
  state: Partial<AppState>;
  inputText: string;
  isValid: boolean;
  description: string;
}

/**
 * Recovery attempt information
 */
export interface RecoveryAttempt {
  timestamp: Date;
  error: ValidationError;
  strategy: RecoveryStrategy;
  success: boolean;
  correctedText?: string;
  failureReason?: string;
  
  // Recovery metrics
  timeToRecover?: number;
  
  // Description for accessibility
  description: string;
  
  // Previous and new state for state recovery
  previousState?: Partial<AppState>;
  newState?: Partial<AppState>;
  
  // Suggestion offered to user
  suggestion?: string;
}

/**
 * Result of a recovery attempt
 */
export interface RecoveryResult {
  success: boolean;
  correctedText?: string;
  newInputText?: string;
  newState?: Partial<AppState>;
  attempt?: RecoveryAttempt;
}

/**
 * Recovery strategies
 */
export enum RecoveryStrategy {
  RESTORE_LAST_VALID = 'restore_last_valid',
  CLEAR_INVALID_LINES = 'clear_invalid_lines',
  AUTO_FIX_NOTES = 'auto_fix_notes',
  PARTIAL_RECOVERY = 'partial_recovery',
  MANUAL_INTERVENTION = 'manual_intervention'
}

/**
 * Event handlers for error recovery system
 */
export interface ErrorRecoveryEvents {
  onRecoveryAttempted?: (attempt: RecoveryAttempt) => void;
  onRecoverySucceeded?: (attempt: RecoveryAttempt, newState: Partial<AppState>) => void;
  onRecoveryFailed?: (attempt: RecoveryAttempt) => void;
  onStateBackedUp?: (backup: StateBackup) => void;
  onStateRestored?: (backup: StateBackup) => void;
  onErrorBoundaryTriggered?: (error: Error, context: string) => void;
}

/**
 * ErrorRecoverySystem manages error recovery and state preservation
 */
export class ErrorRecoverySystem {
  private config: ErrorRecoveryConfig;
  private events: ErrorRecoveryEvents;
  private stateBackups: StateBackup[] = [];
  private recoveryAttempts: RecoveryAttempt[] = [];
  private backupTimer: ReturnType<typeof setInterval> | null = null;
  private lastValidState: Partial<AppState> | null = null;
  private lastValidInputText: string = '';
  private recoveryCount: number = 0;

  constructor(events: ErrorRecoveryEvents = {}, config?: Partial<ErrorRecoveryConfig>) {
    this.events = events;
    this.config = {
      enableAutoRecovery: true,
      enableStateBackup: true,
      maxRecoveryAttempts: 3,
      backupInterval: 30000, // 30 seconds
      maxBackupHistory: 10,
      enableErrorBoundary: true,
      fallbackToLastValidState: true,
      ...config
    };

    this.initialize();
  }

  /**
   * Initialize the error recovery system
   */
  private initialize(): void {
    if (this.config.enableStateBackup) {
      this.startBackupTimer();
    }

    if (this.config.enableErrorBoundary) {
      this.setupErrorBoundary();
    }

    // Load any existing backups from localStorage
    this.loadBackupsFromStorage();
  }

  /**
   * Attempt to recover from an error
   */
  async attemptRecovery(
    error: ValidationError,
    _currentState: Partial<AppState>,
    inputText: string
  ): Promise<RecoveryResult> {    if (!this.config.enableAutoRecovery || this.recoveryCount >= this.config.maxRecoveryAttempts) {
      return { success: false };
    }

    this.recoveryCount++;

    // Determine recovery strategy based on error type
    const strategy = this.determineRecoveryStrategy(error, _currentState, inputText);
    
    const attempt: RecoveryAttempt = {
      timestamp: new Date(),
      error,
      strategy,
      success: false,
      description: this.getRecoveryDescription(strategy, error)
    };

    try {
      const result = await this.executeRecoveryStrategy(strategy, error, _currentState, inputText);
      
      attempt.success = result.success;
      this.recoveryAttempts.push(attempt);

      if (this.events.onRecoveryAttempted) {
        this.events.onRecoveryAttempted(attempt);
      }

      if (result.success) {
        if (this.events.onRecoverySucceeded) {
          this.events.onRecoverySucceeded(attempt, result.newState || _currentState);
        }
        
        // Reset recovery count on successful recovery
        this.recoveryCount = 0;
        
        return {
          success: true,
          newState: result.newState,
          newInputText: result.newInputText
        };
      } else {
        if (this.events.onRecoveryFailed) {
          this.events.onRecoveryFailed(attempt);
        }
        
        return { success: false };
      }
    } catch (recoveryError) {
      attempt.success = false;
      attempt.description += ` (Recovery failed: ${recoveryError instanceof Error ? recoveryError.message : 'Unknown error'})`;
      
      this.recoveryAttempts.push(attempt);
      
      if (this.events.onRecoveryFailed) {
        this.events.onRecoveryFailed(attempt);
      }
      
      return { success: false };
    }
  }

  /**
   * Backup current state
   */
  backupState(state: Partial<AppState>, inputText: string, isValid: boolean, description?: string): string {
    if (!this.config.enableStateBackup) {
      return '';
    }

    const backup: StateBackup = {
      id: this.generateBackupId(),
      timestamp: new Date(),
      state: this.deepClone(state),
      inputText,
      isValid,
      description: description || (isValid ? 'Valid state backup' : 'Invalid state backup')
    };

    this.stateBackups.push(backup);

    // Maintain backup history limit
    while (this.stateBackups.length > this.config.maxBackupHistory) {
      this.stateBackups.shift();
    }

    // Update last valid state if this backup is valid
    if (isValid) {
      this.lastValidState = this.deepClone(state);
      this.lastValidInputText = inputText;
    }

    // Save to localStorage
    this.saveBackupsToStorage();

    if (this.events.onStateBackedUp) {
      this.events.onStateBackedUp(backup);
    }

    return backup.id;
  }

  /**
   * Restore state from backup
   */
  restoreState(backupId: string): { success: boolean; state?: Partial<AppState>; inputText?: string } {
    const backup = this.stateBackups.find(b => b.id === backupId);
    
    if (!backup) {
      return { success: false };
    }

    if (this.events.onStateRestored) {
      this.events.onStateRestored(backup);
    }

    return {
      success: true,
      state: this.deepClone(backup.state),
      inputText: backup.inputText
    };
  }

  /**
   * Get the last valid state
   */
  getLastValidState(): { state: Partial<AppState> | null; inputText: string } {
    return {
      state: this.lastValidState ? this.deepClone(this.lastValidState) : null,
      inputText: this.lastValidInputText
    };
  }

  /**
   * Get all state backups
   */
  getStateBackups(): StateBackup[] {
    return [...this.stateBackups];
  }

  /**
   * Get valid state backups only
   */
  getValidStateBackups(): StateBackup[] {
    return this.stateBackups.filter(backup => backup.isValid);
  }

  /**
   * Get recovery attempts history
   */
  getRecoveryAttempts(): RecoveryAttempt[] {
    return [...this.recoveryAttempts];
  }

  /**
   * Clear recovery history
   */
  clearRecoveryHistory(): void {
    this.recoveryAttempts.length = 0;
    this.recoveryCount = 0;
  }

  /**
   * Clear all backups
   */
  clearBackups(): void {
    this.stateBackups.length = 0;
    this.lastValidState = null;
    this.lastValidInputText = '';
    this.saveBackupsToStorage();
  }

  /**
   * Determine appropriate recovery strategy
   */
  private determineRecoveryStrategy(
    error: ValidationError, 
    _currentState: Partial<AppState>,
    _inputText: string
  ): RecoveryStrategy {
    
    switch (error.type) {
      case ErrorType.UNSUPPORTED_NOTE:
        return RecoveryStrategy.AUTO_FIX_NOTES;
      
      case ErrorType.EMPTY_INPUT:
        return this.config.fallbackToLastValidState && this.lastValidState 
          ? RecoveryStrategy.RESTORE_LAST_VALID 
          : RecoveryStrategy.MANUAL_INTERVENTION;
      
      case ErrorType.PARSING_ERROR:
        if (error.line !== undefined) {
          return RecoveryStrategy.CLEAR_INVALID_LINES;
        }
        return RecoveryStrategy.PARTIAL_RECOVERY;
      
      case ErrorType.INVALID_FILE_TYPE:
      case ErrorType.RENDERING_ERROR:
      case ErrorType.EXPORT_ERROR:
        return this.config.fallbackToLastValidState && this.lastValidState
          ? RecoveryStrategy.RESTORE_LAST_VALID
          : RecoveryStrategy.MANUAL_INTERVENTION;
      
      default:
        return RecoveryStrategy.MANUAL_INTERVENTION;
    }
  }

  /**
   * Execute recovery strategy
   */
  private async executeRecoveryStrategy(
    strategy: RecoveryStrategy,
    error: ValidationError,
    _currentState: Partial<AppState>,
    inputText: string
  ): Promise<{ success: boolean; newState?: Partial<AppState>; newInputText?: string }> {
    
    switch (strategy) {
      case RecoveryStrategy.RESTORE_LAST_VALID:
        return this.executeRestoreLastValid();
      
      case RecoveryStrategy.CLEAR_INVALID_LINES:
        return this.executeClearInvalidLines(error, inputText);
      
      case RecoveryStrategy.AUTO_FIX_NOTES:
        return this.executeAutoFixNotes(error, inputText);
      
      case RecoveryStrategy.PARTIAL_RECOVERY:
        return this.executePartialRecovery(inputText);
      
      case RecoveryStrategy.MANUAL_INTERVENTION:
      default:
        return { success: false };
    }
  }

  /**
   * Execute restore last valid state strategy
   */
  private executeRestoreLastValid(): Promise<{ success: boolean; newState?: Partial<AppState>; newInputText?: string }> {
    if (!this.lastValidState) {
      return Promise.resolve({ success: false });
    }

    return Promise.resolve({
      success: true,
      newState: this.deepClone(this.lastValidState),
      newInputText: this.lastValidInputText
    });
  }

  /**
   * Execute clear invalid lines strategy
   */
  private executeClearInvalidLines(
    error: ValidationError, 
    inputText: string
  ): Promise<{ success: boolean; newState?: Partial<AppState>; newInputText?: string }> {
    
    if (error.line === undefined) {
      return Promise.resolve({ success: false });
    }

    const lines = inputText.split('\n');
    const lineIndex = error.line - 1;
    
    if (lineIndex >= 0 && lineIndex < lines.length) {
      // Remove the problematic line
      lines.splice(lineIndex, 1);
      const newInputText = lines.join('\n');
      
      return Promise.resolve({
        success: true,
        newInputText
      });
    }

    return Promise.resolve({ success: false });
  }

  /**
   * Execute auto-fix notes strategy
   */
  private executeAutoFixNotes(
    _error: ValidationError, 
    inputText: string
  ): Promise<{ success: boolean; newState?: Partial<AppState>; newInputText?: string }> {
    
    // Try to auto-fix common note issues
    let fixedText = inputText;
    
    // Convert common note variations
    const noteFixMap: Record<string, string> = {
      'B': 'Bb',
      'b': 'Bb',
      'A#': 'Bb',
      'a#': 'Bb',
      'H': 'Bb', // German notation
      'h': 'Bb'
    };

    // Apply fixes
    Object.entries(noteFixMap).forEach(([from, to]) => {
      const regex = new RegExp(`\\b${from}\\b`, 'g');
      fixedText = fixedText.replace(regex, to);
    });

    // Check if any changes were made
    if (fixedText !== inputText) {
      return Promise.resolve({
        success: true,
        newInputText: fixedText
      });
    }

    return Promise.resolve({ success: false });
  }

  /**
   * Execute partial recovery strategy
   */
  private executePartialRecovery(inputText: string): Promise<{ success: boolean; newState?: Partial<AppState>; newInputText?: string }> {
    // Try to extract valid parts of the input
    const lines = inputText.split('\n');
    const validLines: string[] = [];
    
    // Keep the title (first line) if it exists
    if (lines.length > 0 && lines[0].trim()) {
      validLines.push(lines[0]);
    }

    // Filter out obviously invalid lines
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line && this.isLinePartiallyValid(line)) {
        validLines.push(line);
      }
    }

    if (validLines.length > 1) { // Title + at least one note line
      return Promise.resolve({
        success: true,
        newInputText: validLines.join('\n')
      });
    }

    return Promise.resolve({ success: false });
  }

  /**
   * Check if a line is partially valid (contains some recognizable notes)
   */
  private isLinePartiallyValid(line: string): boolean {
    const supportedNotes = ['F', 'G', 'A', 'Bb', 'C', 'D', 'E', 'B']; // Include B for conversion
    const words = line.split(/[\s,|\-]+/).map(w => w.trim().toUpperCase());
    
    // Check if at least 50% of words are valid notes
    const validNoteCount = words.filter(word => 
      supportedNotes.some(note => word.includes(note))
    ).length;
    
    return words.length > 0 && (validNoteCount / words.length) >= 0.5;
  }

  /**
   * Get description for recovery strategy
   */
  private getRecoveryDescription(strategy: RecoveryStrategy, error: ValidationError): string {
    switch (strategy) {
      case RecoveryStrategy.RESTORE_LAST_VALID:
        return 'Restoring last valid state';
      case RecoveryStrategy.CLEAR_INVALID_LINES:
        return `Removing invalid line ${error.line}`;
      case RecoveryStrategy.AUTO_FIX_NOTES:
        return 'Auto-fixing note notation';
      case RecoveryStrategy.PARTIAL_RECOVERY:
        return 'Recovering valid parts of input';
      case RecoveryStrategy.MANUAL_INTERVENTION:
        return 'Manual intervention required';
      default:
        return 'Unknown recovery strategy';
    }
  }

  /**
   * Start automatic state backup timer
   */
  private startBackupTimer(): void {
    if (this.backupTimer) {
      clearInterval(this.backupTimer);
    }

    this.backupTimer = setInterval(() => {
      // This will be called by the application to backup current state
      // The actual backup is triggered externally
    }, this.config.backupInterval);
  }

  /**
   * Set up error boundary for unhandled errors
   */
  private setupErrorBoundary(): void {
    // Global error handler
    window.addEventListener('error', (event) => {
      if (this.events.onErrorBoundaryTriggered) {
        this.events.onErrorBoundaryTriggered(
          new Error(event.message), 
          `Global error at ${event.filename}:${event.lineno}:${event.colno}`
        );
      }
    });

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      if (this.events.onErrorBoundaryTriggered) {
        this.events.onErrorBoundaryTriggered(
          new Error(event.reason), 
          'Unhandled promise rejection'
        );
      }
    });
  }

  /**
   * Save backups to localStorage
   */
  private saveBackupsToStorage(): void {
    try {
      const backupsData = {
        backups: this.stateBackups.slice(-5), // Keep only last 5 in storage
        lastValidState: this.lastValidState,
        lastValidInputText: this.lastValidInputText
      };
      
      localStorage.setItem('ocarina-error-recovery-backups', JSON.stringify(backupsData));
    } catch (error) {
      console.warn('Failed to save backups to localStorage:', error);
    }
  }

  /**
   * Load backups from localStorage
   */
  private loadBackupsFromStorage(): void {
    try {
      const stored = localStorage.getItem('ocarina-error-recovery-backups');
      if (stored) {
        const backupsData = JSON.parse(stored);
        
        if (backupsData.backups) {
          this.stateBackups = backupsData.backups.map((backup: any) => ({
            ...backup,
            timestamp: new Date(backup.timestamp)
          }));
        }
        
        if (backupsData.lastValidState) {
          this.lastValidState = backupsData.lastValidState;
          this.lastValidInputText = backupsData.lastValidInputText || '';
        }
      }
    } catch (error) {
      console.warn('Failed to load backups from localStorage:', error);
    }
  }

  /**
   * Generate unique backup ID
   */
  private generateBackupId(): string {
    return `backup-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Deep clone an object
   */
  private deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    
    if (obj instanceof Date) {
      return new Date(obj.getTime()) as unknown as T;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.deepClone(item)) as unknown as T;
    }
    
    const cloned = {} as T;
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = this.deepClone(obj[key]);
      }
    }
    
    return cloned;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ErrorRecoveryConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Restart backup timer if interval changed
    if (config.backupInterval !== undefined && this.config.enableStateBackup) {
      this.startBackupTimer();
    }
  }

  /**
   * Destroy the error recovery system and clean up
   */
  destroy(): void {
    if (this.backupTimer) {
      clearInterval(this.backupTimer);
      this.backupTimer = null;
    }

    // Save final state to localStorage
    this.saveBackupsToStorage();

    // Clear memory
    this.stateBackups.length = 0;
    this.recoveryAttempts.length = 0;
    this.lastValidState = null;
    this.lastValidInputText = '';
  }
}