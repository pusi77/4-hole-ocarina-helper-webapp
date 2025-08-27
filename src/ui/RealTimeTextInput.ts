/**
 * RealTimeTextInput - Real-time text input component with validation and preview
 * Handles debounced updates, error highlighting, and live chart preview
 */

import type { 
  ValidationResult, 
  ValidationError, 
  ValidationWarning,
  Song 
} from '../types/index.js';
import { NoteParser } from '../core/NoteParser.js';
import { debounce } from '../utils/debounce.js';

/**
 * Configuration for real-time text input behavior
 */
interface RealTimeInputConfig {
  debounceDelay: number;
  showValidationErrors: boolean;
  highlightErrors: boolean;
  autoResize: boolean;
  minHeight: number;
  maxHeight: number;
}

/**
 * Event handlers for RealTimeTextInput
 */
export interface RealTimeInputEvents {
  onSongParsed: (song: Song) => void;
  onValidationResult: (result: ValidationResult) => void;
  onError: (error: ValidationError) => void;
  onTextChange: (text: string) => void;
  getTitleForParsing?: () => string; // Optional title provider
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: RealTimeInputConfig = {
  debounceDelay: 300, // 300ms debounce for smooth performance
  showValidationErrors: true,
  highlightErrors: true,
  autoResize: true,
  minHeight: 120,
  maxHeight: 400
};

/**
 * RealTimeTextInput class for handling real-time text input with validation
 */
export class RealTimeTextInput {
  private textArea: HTMLTextAreaElement;
  private errorContainer!: HTMLElement;
  private warningContainer!: HTMLElement;
  private config: RealTimeInputConfig;
  private events: RealTimeInputEvents;
  private parser: NoteParser;
  private debouncedUpdate: (...args: any[]) => void;
  private currentText: string = '';


  constructor(
    textArea: HTMLTextAreaElement,
    events: RealTimeInputEvents,
    config: Partial<RealTimeInputConfig> = {}
  ) {
    this.textArea = textArea;
    this.events = events;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.parser = new NoteParser();
    
    // Create debounced update function
    this.debouncedUpdate = debounce(
      this.processInput.bind(this),
      this.config.debounceDelay
    );
    
    this.initialize();
  }

  /**
   * Initialize the component
   */
  private initialize(): void {
    this.setupTextArea();
    this.createErrorContainers();
    this.attachEventListeners();
    // Initialization complete
    
    // Process initial content if any
    if (this.textArea.value.trim()) {
      this.currentText = this.textArea.value;
      this.debouncedUpdate();
    }
  }

  /**
   * Set up text area properties and styling
   */
  private setupTextArea(): void {
    // Set basic properties
    this.textArea.placeholder = `Enter your song notation here...

Example format:
F G A F
G A C D

First line is the title, following lines are notes separated by spaces.
Supported notes: F, G, A, Bb, C, D, E`;

    // Set initial styling
    this.textArea.style.minHeight = `${this.config.minHeight}px`;
    if (this.config.maxHeight > 0) {
      this.textArea.style.maxHeight = `${this.config.maxHeight}px`;
    }
    this.textArea.style.resize = 'vertical';
    this.textArea.style.fontFamily = 'monospace';
    this.textArea.style.fontSize = '14px';
    this.textArea.style.lineHeight = '1.4';
    this.textArea.style.padding = '12px';
    this.textArea.style.border = '2px solid #ddd';
    this.textArea.style.borderRadius = '4px';
    this.textArea.style.outline = 'none';
    this.textArea.style.transition = 'border-color 0.2s ease';
    
    // Add focus styling
    this.textArea.addEventListener('focus', () => {
      this.textArea.style.borderColor = '#007acc';
    });
    
    this.textArea.addEventListener('blur', () => {
      this.textArea.style.borderColor = '#ddd';
    });
  }

  /**
   * Create containers for error and warning messages
   */
  private createErrorContainers(): void {
    // Create error container
    this.errorContainer = document.createElement('div');
    this.errorContainer.className = 'validation-errors';
    this.errorContainer.style.marginTop = '8px';
    this.errorContainer.style.display = 'none';
    
    // Create warning container
    this.warningContainer = document.createElement('div');
    this.warningContainer.className = 'validation-warnings';
    this.warningContainer.style.marginTop = '4px';
    this.warningContainer.style.display = 'none';
    
    // Insert after text area
    const parent = this.textArea.parentElement;
    if (parent) {
      parent.insertBefore(this.errorContainer, this.textArea.nextSibling);
      parent.insertBefore(this.warningContainer, this.errorContainer.nextSibling);
    }
  }

  /**
   * Attach event listeners
   */
  private attachEventListeners(): void {
    // Input event for real-time updates
    this.textArea.addEventListener('input', this.handleInput.bind(this));
    
    // Paste event
    this.textArea.addEventListener('paste', this.handlePaste.bind(this));
    
    // Auto-resize if enabled
    if (this.config.autoResize) {
      this.textArea.addEventListener('input', this.autoResize.bind(this));
    }
  }

  /**
   * Handle input events
   */
  private handleInput(event: Event): void {
    const target = event.target as HTMLTextAreaElement;
    const newText = target.value;
    
    // Only process if text actually changed
    if (newText !== this.currentText) {
      this.currentText = newText;
      this.events.onTextChange(newText);
      
      // Clear previous validation styling immediately for responsiveness
      this.clearValidationStyling();
      
      // Debounced processing for performance
      this.debouncedUpdate();
    }
  }

  /**
   * Handle paste events
   */
  private handlePaste(_event: ClipboardEvent): void {
    // Allow default paste behavior, then process after a short delay
    setTimeout(() => {
      const newText = this.textArea.value;
      if (newText !== this.currentText) {
        this.currentText = newText;
        this.events.onTextChange(newText);
        this.debouncedUpdate();
      }
    }, 10);
  }

  /**
   * Auto-resize text area based on content
   */
  private autoResize(): void {
    // Reset height to auto to get the correct scrollHeight
    this.textArea.style.height = 'auto';
    
    // Calculate new height
    const newHeight = Math.min(
      Math.max(this.textArea.scrollHeight, this.config.minHeight),
      this.config.maxHeight
    );
    
    this.textArea.style.height = `${newHeight}px`;
  }

  /**
   * Process input text (debounced)
   */
  private processInput(): void {
    const text = this.currentText.trim();
    
    // Handle empty input
    if (!text) {
      this.clearValidation();
      return;
    }
    
    try {
      // Prepare input for validation (combine with title if available)
      let inputForValidation = text;
      if (this.events.getTitleForParsing) {
        const title = this.events.getTitleForParsing();
        inputForValidation = title + '\n' + text;
      }
      
      // Validate input first
      const validationResult = this.parser.validateInput(inputForValidation);
      this.events.onValidationResult(validationResult);
      
      // Display validation results
      this.displayValidationResults(validationResult);
      
      // If valid, parse and emit song
      if (validationResult.isValid) {
        // Combine title and notation for parsing
        let inputForParsing = text;
        if (this.events.getTitleForParsing) {
          const title = this.events.getTitleForParsing();
          inputForParsing = title + '\n' + text;
        }
        
        const song = this.parser.parseSong(inputForParsing);
        this.events.onSongParsed(song);
        this.setValidationState('valid');
      } else {
        this.setValidationState('invalid');
      }
      
    } catch (error) {
      // Handle parsing errors
      const validationError: ValidationError = {
        type: 'parsing_error' as any,
        message: error instanceof Error ? error.message : 'Unknown parsing error',
        suggestions: ['Check your input format', 'Try using an example song']
      };
      
      this.events.onError(validationError);
      this.displayError(validationError);
      this.setValidationState('error');
    }
  }

  /**
   * Display validation results (errors and warnings)
   */
  private displayValidationResults(result: ValidationResult): void {
    // Display errors
    if (result.errors.length > 0 && this.config.showValidationErrors) {
      this.displayErrors(result.errors);
    } else {
      this.hideErrors();
    }
    
    // Display warnings
    if (result.warnings.length > 0) {
      this.displayWarnings(result.warnings);
    } else {
      this.hideWarnings();
    }
    
    // Highlight errors in text area if enabled
    if (this.config.highlightErrors && result.errors.length > 0) {
      this.highlightErrors(result.errors);
    }
  }

  /**
   * Display error messages
   */
  private displayErrors(errors: ValidationError[]): void {
    this.errorContainer.innerHTML = '';
    this.errorContainer.style.display = 'block';
    
    errors.forEach(error => {
      const errorElement = this.createErrorElement(error, 'error');
      this.errorContainer.appendChild(errorElement);
    });
  }

  /**
   * Display a single error
   */
  private displayError(error: ValidationError): void {
    this.displayErrors([error]);
  }

  /**
   * Display warning messages
   */
  private displayWarnings(warnings: ValidationWarning[]): void {
    this.warningContainer.innerHTML = '';
    this.warningContainer.style.display = 'block';
    
    warnings.forEach(warning => {
      const warningElement = this.createErrorElement(warning, 'warning');
      this.warningContainer.appendChild(warningElement);
    });
  }

  /**
   * Create an error or warning element
   */
  private createErrorElement(
    item: ValidationError | ValidationWarning, 
    type: 'error' | 'warning'
  ): HTMLElement {
    const element = document.createElement('div');
    element.className = `validation-${type}`;
    
    // Styling
    element.style.padding = '8px 12px';
    element.style.marginBottom = '4px';
    element.style.borderRadius = '4px';
    element.style.fontSize = '13px';
    element.style.lineHeight = '1.4';
    
    if (type === 'error') {
      element.style.backgroundColor = '#fee';
      element.style.border = '1px solid #fcc';
      element.style.color = '#c33';
    } else {
      element.style.backgroundColor = '#fff3cd';
      element.style.border = '1px solid #ffeaa7';
      element.style.color = '#856404';
    }
    
    // Message content
    let content = `<strong>${type === 'error' ? '❌' : '⚠️'} ${item.message}</strong>`;
    
    // Add line/position info if available
    if ('line' in item && item.line) {
      content += ` <em>(Line ${item.line}${item.position ? `, position ${item.position}` : ''})</em>`;
    }
    
    // Add suggestions if available
    if ('suggestions' in item && item.suggestions && item.suggestions.length > 0) {
      content += '<br><small><strong>Suggestions:</strong> ' + item.suggestions.join(', ') + '</small>';
    }
    
    element.innerHTML = content;
    return element;
  }

  /**
   * Hide error messages
   */
  private hideErrors(): void {
    this.errorContainer.style.display = 'none';
    this.errorContainer.innerHTML = '';
  }

  /**
   * Hide warning messages
   */
  private hideWarnings(): void {
    this.warningContainer.style.display = 'none';
    this.warningContainer.innerHTML = '';
  }

  /**
   * Highlight errors in the text area (basic implementation)
   */
  private highlightErrors(_errors: ValidationError[]): void {
    // For now, just change border color to indicate errors
    // More sophisticated highlighting would require a more complex implementation
    this.textArea.style.borderColor = '#f56565';
    this.textArea.style.boxShadow = '0 0 0 3px rgba(245, 101, 101, 0.1)';
  }

  /**
   * Set validation state styling
   */
  private setValidationState(state: 'valid' | 'invalid' | 'error' | 'neutral'): void {
    // Reset styles
    this.clearValidationStyling();
    
    switch (state) {
      case 'valid':
        this.textArea.style.borderColor = '#48bb78';
        this.textArea.style.boxShadow = '0 0 0 3px rgba(72, 187, 120, 0.1)';
        break;
      case 'invalid':
      case 'error':
        this.textArea.style.borderColor = '#f56565';
        this.textArea.style.boxShadow = '0 0 0 3px rgba(245, 101, 101, 0.1)';
        break;
      case 'neutral':
      default:
        // Keep default styling
        break;
    }
  }

  /**
   * Clear validation styling
   */
  private clearValidationStyling(): void {
    this.textArea.style.borderColor = '#ddd';
    this.textArea.style.boxShadow = 'none';
  }

  /**
   * Clear all validation messages and styling
   */
  private clearValidation(): void {
    this.hideErrors();
    this.hideWarnings();
    this.setValidationState('neutral');
  }

  /**
   * Set text content programmatically
   */
  public setText(text: string): void {
    this.textArea.value = text;
    this.currentText = text;
    this.events.onTextChange(text);
    
    // Auto-resize if enabled
    if (this.config.autoResize) {
      this.autoResize();
    }
    
    // Process immediately (not debounced for programmatic changes)
    this.processInput();
  }

  /**
   * Get current text content
   */
  public getText(): string {
    return this.currentText;
  }

  /**
   * Clear all content
   */
  public clear(): void {
    this.setText('');
  }

  /**
   * Focus the text area
   */
  public focus(): void {
    this.textArea.focus();
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<RealTimeInputConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Recreate debounced function if delay changed
    if (newConfig.debounceDelay !== undefined) {
      this.debouncedUpdate = debounce(
        this.processInput.bind(this),
        this.config.debounceDelay
      );
    }
  }

  /**
   * Trigger reparse of current content (useful when external factors change)
   */
  public triggerReparse(): void {
    this.processInput();
  }

  /**
   * Destroy the component and clean up
   */
  public destroy(): void {
    // Remove event listeners
    this.textArea.removeEventListener('input', this.handleInput);
    this.textArea.removeEventListener('paste', this.handlePaste);
    
    // Remove created elements
    if (this.errorContainer.parentElement) {
      this.errorContainer.parentElement.removeChild(this.errorContainer);
    }
    if (this.warningContainer.parentElement) {
      this.warningContainer.parentElement.removeChild(this.warningContainer);
    }
    
    // Clear validation styling
    this.clearValidationStyling();
  }
}