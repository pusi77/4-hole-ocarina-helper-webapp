/**
 * InputManager - Handles file upload functionality and input processing
 * Manages drag-and-drop, file picker, and input validation
 */

import type {
  ValidationResult,
  ValidationError,
  ExampleSong,
} from '../types/index.js';
import { ACCEPTED_FILE_TYPES, ErrorType } from '../types/index.js';
import { ExampleLoader, type ExampleLoaderEvents } from './ExampleLoader.js';

/**
 * Configuration for file upload handling
 */
interface FileUploadConfig {
  maxFileSize: number; // in bytes
  acceptedTypes: readonly string[];
  allowMultiple: boolean;
}

/**
 * Event handlers for InputManager
 */
export interface InputManagerEvents {
  onFileLoaded: (content: string, filename: string) => void;
  onTextInput: (text: string) => void;
  onValidationResult: (result: ValidationResult) => void;
  onError: (error: ValidationError) => void;
  onExampleLoaded?: (notation: string, title: string) => void;
  onExampleSelected?: (song: ExampleSong) => void;
}

/**
 * InputManager class handles all file input operations
 */
export class InputManager {
  private config: FileUploadConfig;
  private events: InputManagerEvents;
  private dropZone: HTMLElement | null = null;
  private fileInput: HTMLInputElement | null = null;
  private textArea: HTMLTextAreaElement | null = null;
  private exampleLoader: ExampleLoader | null = null;

  constructor(events: InputManagerEvents, config?: Partial<FileUploadConfig>) {
    this.events = events;
    this.config = {
      maxFileSize: 1024 * 1024, // 1MB default
      acceptedTypes: [...ACCEPTED_FILE_TYPES],
      allowMultiple: false,
      ...config,
    };
  }

  /**
   * Initialize the InputManager with DOM elements
   */
  initialize(elements: {
    dropZone?: HTMLElement;
    fileInput?: HTMLInputElement;
    textArea?: HTMLTextAreaElement;
    exampleContainer?: HTMLElement;
  }): void {
    if (elements.dropZone) {
      this.setupDropZone(elements.dropZone);
    }

    if (elements.fileInput) {
      this.setupFileInput(elements.fileInput);
    }

    if (elements.textArea) {
      this.setupTextArea(elements.textArea);
    }

    if (elements.exampleContainer) {
      this.setupExampleLoader(elements.exampleContainer);
    }
  }

  /**
   * Set up drag and drop functionality
   */
  private setupDropZone(dropZone: HTMLElement): void {
    this.dropZone = dropZone;

    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach((eventName) => {
      dropZone.addEventListener(eventName, this.preventDefaults, false);
      document.body.addEventListener(eventName, this.preventDefaults, false);
    });

    // Highlight drop zone when item is dragged over it
    ['dragenter', 'dragover'].forEach((eventName) => {
      dropZone.addEventListener(
        eventName,
        () => this.highlight(dropZone),
        false
      );
    });

    ['dragleave', 'drop'].forEach((eventName) => {
      dropZone.addEventListener(
        eventName,
        () => this.unhighlight(dropZone),
        false
      );
    });

    // Handle dropped files
    dropZone.addEventListener('drop', this.handleDrop.bind(this), false);
  }

  /**
   * Set up file input element
   */
  private setupFileInput(fileInput: HTMLInputElement): void {
    this.fileInput = fileInput;

    // Set accepted file types
    fileInput.accept = this.config.acceptedTypes.join(',');
    fileInput.multiple = this.config.allowMultiple;

    fileInput.addEventListener('change', this.handleFileInputChange.bind(this));
  }

  /**
   * Set up text area for direct input
   */
  private setupTextArea(textArea: HTMLTextAreaElement): void {
    this.textArea = textArea;

    textArea.addEventListener('input', this.handleTextInput.bind(this));
    textArea.addEventListener('paste', this.handlePaste.bind(this));
  }

  /**
   * Set up example loader
   */
  private setupExampleLoader(container: HTMLElement): void {
    const exampleEvents: ExampleLoaderEvents = {
      onExampleSelected: (song: ExampleSong) => {
        if (this.events.onExampleSelected) {
          this.events.onExampleSelected(song);
        }
      },
      onExampleLoaded: (notation: string, title: string) => {
        // Load the notation into the text area
        this.setText(notation);

        if (this.events.onExampleLoaded) {
          this.events.onExampleLoaded(notation, title);
        }
      },
      onError: (message: string) => {
        this.events.onError({
          type: ErrorType.PARSING_ERROR,
          message: `Example loading error: ${message}`,
          suggestions: [
            'Try selecting a different example',
            'Refresh the page and try again',
          ],
        });
      },
    };

    this.exampleLoader = new ExampleLoader(exampleEvents, {
      showCategories: true,
      showDifficulty: true,
      showDescriptions: true,
    });

    this.exampleLoader.initialize(container);
  }

  /**
   * Prevent default drag behaviors
   */
  private preventDefaults(e: Event): void {
    e.preventDefault();
    e.stopPropagation();
  }

  /**
   * Highlight drop zone
   */
  private highlight(element: HTMLElement): void {
    element.classList.add('drag-over');
  }

  /**
   * Remove highlight from drop zone
   */
  private unhighlight(element: HTMLElement): void {
    element.classList.remove('drag-over');
  }

  /**
   * Handle file drop event
   */
  private handleDrop(e: DragEvent): void {
    const dt = e.dataTransfer;
    const files = dt?.files;

    if (files) {
      this.handleFiles(files);
    }
  }

  /**
   * Handle file input change
   */
  private handleFileInputChange(e: Event): void {
    const target = e.target as HTMLInputElement;
    const files = target.files;

    if (files) {
      this.handleFiles(files);
    }
  }

  /**
   * Handle text area input
   */
  private handleTextInput(e: Event): void {
    const target = e.target as HTMLTextAreaElement;
    this.events.onTextInput(target.value);
  }

  /**
   * Handle paste event
   */
  private handlePaste(_e: ClipboardEvent): void {
    // Allow default paste behavior, input event will handle the change
    setTimeout(() => {
      if (this.textArea) {
        this.events.onTextInput(this.textArea.value);
      }
    }, 0);
  }

  /**
   * Process uploaded files
   */
  private async handleFiles(fileList: FileList): Promise<void> {
    const files = Array.from(fileList);

    // Validate files before processing
    const validationResult = this.validateFiles(files);

    if (!validationResult.isValid) {
      validationResult.errors.forEach((error) => {
        this.events.onError(error);
      });
      return;
    }

    // Process the first valid file (or all if multiple allowed)
    const filesToProcess = this.config.allowMultiple ? files : [files[0]];

    for (const file of filesToProcess) {
      try {
        const content = await this.readFile(file);
        this.events.onFileLoaded(content, file.name);
      } catch (error) {
        this.events.onError({
          type: ErrorType.PARSING_ERROR,
          message: `Failed to read file "${file.name}": ${error instanceof Error ? error.message : 'Unknown error'}`,
          suggestions: [
            'Try selecting a different file',
            'Ensure the file is not corrupted',
          ],
        });
      }
    }
  }

  /**
   * Handle file upload (alias for handleFiles for test compatibility)
   */
  public async handleFileUpload(
    fileList: FileList
  ): Promise<{ success: boolean; errors: ValidationError[] }> {
    const files = Array.from(fileList);
    const validationResult = this.validateFiles(files);

    if (!validationResult.isValid) {
      return {
        success: false,
        errors: validationResult.errors,
      };
    }

    const errors: ValidationError[] = [];
    const filesToProcess = this.config.allowMultiple ? files : [files[0]];

    for (const file of filesToProcess) {
      try {
        const content = await this.readFile(file);
        this.events.onFileLoaded(content, file.name);
      } catch (error) {
        const errorObj = {
          type: ErrorType.PARSING_ERROR,
          message: `Failed to read file "${file.name}": ${error instanceof Error ? error.message : 'Unknown error'}`,
          suggestions: [
            'Try selecting a different file',
            'Ensure the file is not corrupted',
          ],
        };
        errors.push(errorObj);
        this.events.onError(errorObj);
      }
    }

    return {
      success: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate uploaded files
   */
  private validateFiles(files: File[]): ValidationResult {
    const errors: ValidationError[] = [];

    if (files.length === 0) {
      errors.push({
        type: ErrorType.EMPTY_INPUT,
        message: 'No files selected',
        suggestions: ['Select at least one file'],
      });
    }

    for (const file of files) {
      // Check file type
      if (!this.isValidFileType(file)) {
        errors.push({
          type: ErrorType.INVALID_FILE_TYPE,
          message: `File "${file.name}" has unsupported type: ${file.type || 'unknown'}`,
          suggestions: [
            'Use text files (.txt)',
            'Ensure the file has proper text content',
          ],
        });
      }

      // Check file size
      if (file.size > this.config.maxFileSize) {
        errors.push({
          type: ErrorType.PARSING_ERROR,
          message: `File "${file.name}" is too large: ${this.formatFileSize(file.size)} (max: ${this.formatFileSize(this.config.maxFileSize)})`,
          suggestions: [
            'Use a smaller file',
            'Split large songs into multiple files',
          ],
        });
      }

      // Check for empty files
      if (file.size === 0) {
        errors.push({
          type: ErrorType.EMPTY_INPUT,
          message: `File "${file.name}" is empty`,
          suggestions: ['Select a file with content'],
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: [],
    };
  }

  /**
   * Check if file type is valid
   */
  private isValidFileType(file: File): boolean {
    // Check MIME type
    if (file.type && this.config.acceptedTypes.includes(file.type)) {
      return true;
    }

    // Check file extension as fallback
    const extension = file.name.toLowerCase().split('.').pop();
    const validExtensions = ['txt', 'text'];

    return validExtensions.includes(extension || '');
  }

  /**
   * Read file content using FileReader API
   */
  private readFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        const result = e.target?.result;
        if (typeof result === 'string') {
          resolve(result);
        } else {
          reject(new Error('Failed to read file as text'));
        }
      };

      reader.onerror = () => {
        reject(new Error('File reading failed'));
      };

      reader.onabort = () => {
        reject(new Error('File reading was aborted'));
      };

      // Read as text with UTF-8 encoding
      reader.readAsText(file, 'UTF-8');
    });
  }

  /**
   * Format file size for display
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Programmatically trigger file picker
   */
  public triggerFilePicker(): void {
    if (this.fileInput) {
      this.fileInput.click();
    }
  }

  /**
   * Set text content programmatically
   */
  public setText(text: string): void {
    if (this.textArea) {
      this.textArea.value = text;
      this.events.onTextInput(text);
    }
  }

  /**
   * Get current text content
   */
  public getText(): string {
    return this.textArea?.value || '';
  }

  /**
   * Clear all input
   */
  public clear(): void {
    if (this.textArea) {
      this.textArea.value = '';
      this.events.onTextInput('');
    }

    if (this.fileInput) {
      this.fileInput.value = '';
    }
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<FileUploadConfig>): void {
    this.config = { ...this.config, ...config };

    // Update file input if it exists
    if (this.fileInput) {
      this.fileInput.accept = this.config.acceptedTypes.join(',');
      this.fileInput.multiple = this.config.allowMultiple;
    }
  }

  /**
   * Load an example song by ID
   */
  public loadExample(songId: string): void {
    if (this.exampleLoader) {
      this.exampleLoader.loadExample(songId);
    }
  }

  /**
   * Get all available examples
   */
  public getAllExamples(): ExampleSong[] {
    return this.exampleLoader?.getAllExamples() || [];
  }

  /**
   * Clear example selection
   */
  public clearExampleSelection(): void {
    if (this.exampleLoader) {
      this.exampleLoader.clearSelection();
    }
  }

  /**
   * Destroy the InputManager and clean up event listeners
   */
  public destroy(): void {
    if (this.dropZone) {
      ['dragenter', 'dragover', 'dragleave', 'drop'].forEach((eventName) => {
        this.dropZone!.removeEventListener(eventName, this.preventDefaults);
      });
    }

    if (this.fileInput) {
      this.fileInput.removeEventListener('change', this.handleFileInputChange);
    }

    if (this.textArea) {
      this.textArea.removeEventListener('input', this.handleTextInput);
      this.textArea.removeEventListener('paste', this.handlePaste);
    }

    if (this.exampleLoader) {
      this.exampleLoader.destroy();
    }
  }
}
