/**
 * RealTimeApp - Main application controller for real-time text input and preview
 * Orchestrates the interaction between text input, validation, and chart preview
 */

import type {
  ValidationResult,
  ValidationError,
  Song,
  ChartConfig,
} from '../types/index.js';
import {
  RealTimeTextInput,
  type RealTimeInputEvents,
} from './RealTimeTextInput.js';
import { PreviewController } from './PreviewController.js';

/**
 * Configuration for the real-time application
 */
interface RealTimeAppConfig {
  textInputConfig?: {
    debounceDelay?: number;
    showValidationErrors?: boolean;
    highlightErrors?: boolean;
    autoResize?: boolean;
    minHeight?: number;
    maxHeight?: number;
  };
  previewConfig?: {
    autoUpdate?: boolean;
    showEmptyState?: boolean;
    emptyStateMessage?: string;
    errorStateMessage?: string;
  };
  chartConfig?: Partial<ChartConfig>;
}

/**
 * Event handlers for the real-time application
 */
export interface RealTimeAppEvents {
  onSongChanged?: (song: Song | null) => void;
  onValidationChanged?: (result: ValidationResult) => void;
  onError?: (error: ValidationError) => void;
  onTextChanged?: (text: string) => void;
}

/**
 * RealTimeApp manages the complete real-time input and preview experience
 */
export class RealTimeApp {
  private textInput: RealTimeTextInput;
  private previewController: PreviewController;
  private events: RealTimeAppEvents;
  private currentSong: Song | null = null;
  private currentValidation: ValidationResult | null = null;
  private titleInput: HTMLInputElement | null = null;

  constructor(
    textArea: HTMLTextAreaElement,
    canvas: HTMLCanvasElement,
    events: RealTimeAppEvents = {},
    config: RealTimeAppConfig = {},
    titleInput?: HTMLInputElement
  ) {
    this.events = events;
    this.titleInput = titleInput || null;

    // Create preview controller
    this.previewController = new PreviewController(
      canvas,
      config.previewConfig,
      config.chartConfig
    );

    // Create text input with event handlers
    const textInputEvents: RealTimeInputEvents = {
      onSongParsed: this.handleSongParsed.bind(this),
      onValidationResult: this.handleValidationResult.bind(this),
      onError: this.handleError.bind(this),
      onTextChange: this.handleTextChange.bind(this),
      getTitleForParsing: this.titleInput
        ? () => this.getCurrentTitle()
        : undefined,
    };

    this.textInput = new RealTimeTextInput(
      textArea,
      textInputEvents,
      config.textInputConfig
    );

    // Set up title input handling if provided
    if (this.titleInput) {
      this.setupTitleInput();
    }

    // Set up resize handling
    this.setupResizeHandling();
  }

  /**
   * Handle successful song parsing
   */
  private handleSongParsed(song: Song): void {
    this.currentSong = song;

    // Update preview
    this.previewController.updatePreview(song);

    // Notify external listeners
    if (this.events.onSongChanged) {
      this.events.onSongChanged(song);
    }
  }

  /**
   * Handle validation results
   */
  private handleValidationResult(result: ValidationResult): void {
    this.currentValidation = result;

    // If validation failed, clear the current song and show error state
    if (!result.isValid) {
      this.currentSong = null;
      this.previewController.handleValidationError();

      if (this.events.onSongChanged) {
        this.events.onSongChanged(null);
      }
    }

    // Notify external listeners
    if (this.events.onValidationChanged) {
      this.events.onValidationChanged(result);
    }
  }

  /**
   * Handle errors
   */
  private handleError(error: ValidationError): void {
    // Clear current song on error
    this.currentSong = null;
    this.previewController.handleValidationError();

    if (this.events.onSongChanged) {
      this.events.onSongChanged(null);
    }

    // Notify external listeners
    if (this.events.onError) {
      this.events.onError(error);
    }
  }

  /**
   * Handle text changes
   */
  private handleTextChange(text: string): void {
    // If text is empty, clear everything
    if (!text.trim()) {
      this.currentSong = null;
      this.currentValidation = null;
      this.previewController.clearPreview();

      if (this.events.onSongChanged) {
        this.events.onSongChanged(null);
      }
    }

    // Notify external listeners
    if (this.events.onTextChanged) {
      this.events.onTextChanged(text);
    }
  }

  /**
   * Set up title input handling
   */
  private setupTitleInput(): void {
    if (!this.titleInput) return;

    // Handle title changes
    const handleTitleChange = () => {
      // Re-trigger parsing with new title
      this.textInput.triggerReparse();
    };

    this.titleInput.addEventListener('input', handleTitleChange);
    this.titleInput.addEventListener('blur', handleTitleChange);
  }

  /**
   * Get the current title from the title input or default
   */
  private getCurrentTitle(): string {
    if (this.titleInput && this.titleInput.value.trim()) {
      return this.titleInput.value.trim();
    }
    return 'Untitled Song';
  }

  /**
   * Set title in the title input
   */
  public setTitle(title: string): void {
    if (this.titleInput) {
      this.titleInput.value = title;
    }
  }

  /**
   * Get title from the title input
   */
  public getTitle(): string {
    return this.getCurrentTitle();
  }

  /**
   * Set up resize handling for responsive layout
   */
  private setupResizeHandling(): void {
    let resizeTimeout: ReturnType<typeof setTimeout>;

    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        this.previewController.resize();
      }, 150);
    };

    window.addEventListener('resize', handleResize);

    // Initial resize
    setTimeout(() => this.previewController.resize(), 100);
  }

  /**
   * Set text content programmatically
   * If text contains multiple lines and first line looks like a title, extract it
   */
  public setText(text: string): void {
    const lines = text.split('\n');

    // If we have a title input and the text has multiple lines,
    // try to extract the title from the first line
    if (this.titleInput && lines.length > 1) {
      const firstLine = lines[0].trim();
      // Check if first line looks like a title (no note patterns)
      const notePattern = /^[A-G#b\s]+$/i;
      if (firstLine && !notePattern.test(firstLine)) {
        this.setTitle(firstLine);
        // Set the rest as notation
        this.textInput.setText(lines.slice(1).join('\n'));
        return;
      }
    }

    // Otherwise, set the full text as notation
    this.textInput.setText(text);
  }

  /**
   * Get current text content
   */
  public getText(): string {
    return this.textInput.getText();
  }

  /**
   * Clear all content
   */
  public clear(): void {
    this.textInput.clear();
    if (this.titleInput) {
      this.titleInput.value = '';
    }
  }

  /**
   * Focus the text input
   */
  public focus(): void {
    this.textInput.focus();
  }

  /**
   * Get current song
   */
  public getCurrentSong(): Song | null {
    return this.currentSong;
  }

  /**
   * Get current validation result
   */
  public getCurrentValidation(): ValidationResult | null {
    return this.currentValidation;
  }

  /**
   * Check if there's content to export
   */
  public canExport(): boolean {
    return this.previewController.hasContent();
  }

  /**
   * Export current chart as PNG
   */
  public exportChart(filename?: string): void {
    if (!this.canExport()) {
      throw new Error('No chart available to export');
    }

    this.previewController.exportChart(filename);
  }

  /**
   * Get export data URL for external use
   */
  public getExportDataURL(): string {
    if (!this.canExport()) {
      throw new Error('No chart available to export');
    }

    return this.previewController.getExportDataURL();
  }

  /**
   * Export chart as blob for programmatic use
   */
  public async exportAsBlob(): Promise<Blob> {
    if (!this.canExport()) {
      throw new Error('No chart available to export');
    }

    return this.previewController.exportAsBlob();
  }

  /**
   * Update text input configuration
   */
  public updateTextInputConfig(
    config: RealTimeAppConfig['textInputConfig']
  ): void {
    if (config) {
      this.textInput.updateConfig(config);
    }
  }

  /**
   * Update preview configuration
   */
  public updatePreviewConfig(config: RealTimeAppConfig['previewConfig']): void {
    if (config) {
      this.previewController.updateConfig(config);
    }
  }

  /**
   * Update chart configuration
   */
  public updateChartConfig(config: Partial<ChartConfig>): void {
    this.previewController.updateChartConfig(config);
  }

  /**
   * Get performance metrics (for testing and optimization)
   */
  public getPerformanceMetrics(): {
    hasCurrentSong: boolean;
    validationState: 'valid' | 'invalid' | 'none';
    textLength: number;
  } {
    return {
      hasCurrentSong: this.currentSong !== null,
      validationState: this.currentValidation
        ? this.currentValidation.isValid
          ? 'valid'
          : 'invalid'
        : 'none',
      textLength: this.getText().length,
    };
  }

  /**
   * Destroy the application and clean up
   */
  public destroy(): void {
    this.textInput.destroy();
    this.previewController.destroy();

    // Clear references
    this.currentSong = null;
    this.currentValidation = null;
  }
}
