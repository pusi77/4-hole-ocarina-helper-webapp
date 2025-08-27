/**
 * ErrorHighlighter - Handles visual error highlighting in text input areas
 * Provides line-by-line error highlighting and tooltips
 */

import type { ValidationResult } from '../types/index.js';

/**
 * Configuration for error highlighting
 */
export interface HighlightConfig {
  showLineNumbers: boolean;
  showTooltips: boolean;
  highlightEntireLine: boolean;
  showGutterIcons: boolean;
  maxTooltipLength: number;
}

/**
 * Highlight information for a specific line
 */
export interface LineHighlight {
  lineNumber: number;
  type: 'error' | 'warning';
  message: string;
  position?: number;
  suggestions?: string[];
}

/**
 * Event handlers for error highlighter
 */
export interface ErrorHighlighterEvents {
  onHighlightClick?: (highlight: LineHighlight) => void;
  onTooltipShow?: (highlight: LineHighlight) => void;
  onTooltipHide?: (highlight: LineHighlight) => void;
}

/**
 * ErrorHighlighter manages visual error feedback in text areas
 */
export class ErrorHighlighter {
  private textArea: HTMLTextAreaElement;
  private container: HTMLElement | null = null;
  private overlayElement: HTMLElement | null = null;
  private gutterElement: HTMLElement | null = null;
  private tooltipElement: HTMLElement | null = null;
  private config: HighlightConfig;
  private events: ErrorHighlighterEvents;
  private currentHighlights: Map<number, LineHighlight> = new Map();
  private resizeObserver: ResizeObserver | null = null;

  constructor(
    textArea: HTMLTextAreaElement,
    events: ErrorHighlighterEvents = {},
    config?: Partial<HighlightConfig>
  ) {
    this.textArea = textArea;
    this.events = events;
    this.config = {
      showLineNumbers: true,
      showTooltips: true,
      highlightEntireLine: true,
      showGutterIcons: true,
      maxTooltipLength: 200,
      ...config
    };

    this.initialize();
  }

  /**
   * Initialize the error highlighter
   */
  private initialize(): void {
    this.setupContainer();
    this.setupEventListeners();
    this.setupResizeObserver();
  }

  /**
   * Update highlights based on validation result
   */
  updateHighlights(validationResult: ValidationResult): void {
    this.clearHighlights();

    // Process errors
    validationResult.errors.forEach(error => {
      if (error.line !== undefined) {
        this.addHighlight({
          lineNumber: error.line,
          type: 'error',
          message: error.message,
          position: error.position,
          suggestions: error.suggestions
        });
      }
    });

    // Process warnings
    validationResult.warnings.forEach(warning => {
      if (warning.line !== undefined) {
        this.addHighlight({
          lineNumber: warning.line,
          type: 'warning',
          message: warning.message,
          position: warning.position
        });
      }
    });

    this.renderHighlights();
  }

  /**
   * Add a single highlight
   */
  addHighlight(highlight: LineHighlight): void {
    this.currentHighlights.set(highlight.lineNumber, highlight);
  }

  /**
   * Remove highlight for a specific line
   */
  removeHighlight(lineNumber: number): void {
    this.currentHighlights.delete(lineNumber);
    this.renderHighlights();
  }

  /**
   * Clear all highlights
   */
  clearHighlights(): void {
    this.currentHighlights.clear();
    this.renderHighlights();
  }

  /**
   * Get all current highlights
   */
  getHighlights(): LineHighlight[] {
    return Array.from(this.currentHighlights.values());
  }

  /**
   * Get highlights by type
   */
  getHighlightsByType(type: 'error' | 'warning'): LineHighlight[] {
    return this.getHighlights().filter(h => h.type === type);
  }

  /**
   * Check if there are any error highlights
   */
  hasErrors(): boolean {
    return this.getHighlightsByType('error').length > 0;
  }

  /**
   * Check if there are any warning highlights
   */
  hasWarnings(): boolean {
    return this.getHighlightsByType('warning').length > 0;
  }

  /**
   * Set up the container structure
   */
  private setupContainer(): void {
    // Create wrapper container
    this.container = document.createElement('div');
    this.container.className = 'error-highlighter-container';
    
    // Wrap the text area
    const parent = this.textArea.parentElement;
    if (parent) {
      parent.insertBefore(this.container, this.textArea);
      this.container.appendChild(this.textArea);
    }

    // Create overlay for highlights
    this.overlayElement = document.createElement('div');
    this.overlayElement.className = 'error-highlight-overlay';
    this.overlayElement.setAttribute('aria-hidden', 'true');
    this.container.appendChild(this.overlayElement);

    // Create gutter for line numbers and icons
    if (this.config.showLineNumbers || this.config.showGutterIcons) {
      this.gutterElement = document.createElement('div');
      this.gutterElement.className = 'error-highlight-gutter';
      this.gutterElement.setAttribute('aria-hidden', 'true');
      this.container.appendChild(this.gutterElement);
    }

    // Create tooltip element
    if (this.config.showTooltips) {
      this.tooltipElement = document.createElement('div');
      this.tooltipElement.className = 'error-highlight-tooltip';
      this.tooltipElement.setAttribute('role', 'tooltip');
      this.tooltipElement.style.display = 'none';
      document.body.appendChild(this.tooltipElement);
    }

    // Add CSS classes to text area
    this.textArea.classList.add('error-highlighter-textarea');
    if (this.config.showLineNumbers) {
      this.textArea.classList.add('with-line-numbers');
    }
  }

  /**
   * Set up event listeners
   */
  private setupEventListeners(): void {
    // Sync scroll position between textarea and overlay
    this.textArea.addEventListener('scroll', () => {
      this.syncScrollPosition();
    });

    // Update highlights on text change
    this.textArea.addEventListener('input', () => {
      this.updateOverlaySize();
    });

    // Handle mouse events for tooltips
    if (this.config.showTooltips) {
      this.overlayElement?.addEventListener('mousemove', (e) => {
        this.handleMouseMove(e);
      });

      this.overlayElement?.addEventListener('mouseleave', () => {
        this.hideTooltip();
      });

      this.overlayElement?.addEventListener('click', (e) => {
        this.handleClick(e);
      });
    }

    // Handle gutter clicks
    if (this.gutterElement) {
      this.gutterElement.addEventListener('click', (e) => {
        this.handleGutterClick(e);
      });
    }
  }

  /**
   * Set up resize observer to handle container size changes
   */
  private setupResizeObserver(): void {
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        this.updateOverlaySize();
        this.renderHighlights();
      });

      this.resizeObserver.observe(this.textArea);
    }
  }

  /**
   * Render all current highlights
   */
  private renderHighlights(): void {
    if (!this.overlayElement) return;

    // Clear existing highlights
    this.overlayElement.innerHTML = '';
    
    if (this.gutterElement) {
      this.gutterElement.innerHTML = '';
    }

    // Get text area metrics
    const textAreaStyle = window.getComputedStyle(this.textArea);
    const lineHeight = parseFloat(textAreaStyle.lineHeight) || 20;
    const paddingTop = parseFloat(textAreaStyle.paddingTop) || 0;
    const paddingLeft = parseFloat(textAreaStyle.paddingLeft) || 0;

    // Get text content and split into lines
    const text = this.textArea.value;
    const lines = text.split('\n');

    // Render highlights for each line
    this.currentHighlights.forEach((highlight, lineNumber) => {
      const lineIndex = lineNumber - 1; // Convert to 0-based index
      
      if (lineIndex >= 0 && lineIndex < lines.length) {
        this.renderLineHighlight(highlight, lineIndex, lineHeight, paddingTop, paddingLeft);
      }
    });

    // Update overlay size and position
    this.updateOverlaySize();
    this.syncScrollPosition();
  }

  /**
   * Render highlight for a specific line
   */
  private renderLineHighlight(
    highlight: LineHighlight,
    lineIndex: number,
    lineHeight: number,
    paddingTop: number,
    paddingLeft: number
  ): void {
    if (!this.overlayElement) return;

    // Create highlight element
    const highlightElement = document.createElement('div');
    highlightElement.className = `error-highlight error-highlight-${highlight.type}`;
    highlightElement.setAttribute('data-line', highlight.lineNumber.toString());
    highlightElement.setAttribute('data-message', highlight.message);
    
    // Position the highlight
    const top = paddingTop + (lineIndex * lineHeight);
    highlightElement.style.top = `${top}px`;
    highlightElement.style.left = `${paddingLeft}px`;
    highlightElement.style.height = `${lineHeight}px`;
    
    // Set width based on configuration
    if (this.config.highlightEntireLine) {
      highlightElement.style.right = '0';
    } else if (highlight.position !== undefined) {
      // Highlight specific position (approximate)
      const charWidth = 8; // Approximate character width
      const startPos = paddingLeft + ((highlight.position - 1) * charWidth);
      highlightElement.style.left = `${startPos}px`;
      highlightElement.style.width = `${charWidth * 2}px`; // Highlight 2 characters
    }

    this.overlayElement.appendChild(highlightElement);

    // Render gutter icon/line number
    if (this.gutterElement) {
      this.renderGutterItem(highlight, lineIndex, lineHeight, paddingTop);
    }
  }

  /**
   * Render gutter item (line number and/or icon)
   */
  private renderGutterItem(
    highlight: LineHighlight,
    lineIndex: number,
    lineHeight: number,
    paddingTop: number
  ): void {
    if (!this.gutterElement) return;

    const gutterItem = document.createElement('div');
    gutterItem.className = `error-gutter-item error-gutter-${highlight.type}`;
    gutterItem.setAttribute('data-line', highlight.lineNumber.toString());
    
    // Position the gutter item
    const top = paddingTop + (lineIndex * lineHeight);
    gutterItem.style.top = `${top}px`;
    gutterItem.style.height = `${lineHeight}px`;

    // Add content
    let content = '';
    if (this.config.showLineNumbers) {
      content += `<span class="line-number">${highlight.lineNumber}</span>`;
    }
    if (this.config.showGutterIcons) {
      const icon = highlight.type === 'error' ? '⚠️' : '⚡';
      content += `<span class="gutter-icon">${icon}</span>`;
    }
    
    gutterItem.innerHTML = content;
    this.gutterElement.appendChild(gutterItem);
  }

  /**
   * Update overlay size to match text area
   */
  private updateOverlaySize(): void {
    if (!this.overlayElement) return;

    const rect = this.textArea.getBoundingClientRect();
    const containerRect = this.container?.getBoundingClientRect();
    
    if (containerRect) {
      this.overlayElement.style.width = `${rect.width}px`;
      this.overlayElement.style.height = `${rect.height}px`;
    }
  }

  /**
   * Sync scroll position between textarea and overlay
   */
  private syncScrollPosition(): void {
    if (!this.overlayElement) return;

    this.overlayElement.scrollTop = this.textArea.scrollTop;
    this.overlayElement.scrollLeft = this.textArea.scrollLeft;

    if (this.gutterElement) {
      this.gutterElement.scrollTop = this.textArea.scrollTop;
    }
  }

  /**
   * Handle mouse move for tooltip display
   */
  private handleMouseMove(e: MouseEvent): void {
    const target = e.target as HTMLElement;
    const highlightElement = target.closest('.error-highlight') as HTMLElement;
    
    if (highlightElement) {
      const lineNumber = parseInt(highlightElement.getAttribute('data-line') || '0');
      const highlight = this.currentHighlights.get(lineNumber);
      
      if (highlight) {
        this.showTooltip(highlight, e.clientX, e.clientY);
      }
    } else {
      this.hideTooltip();
    }
  }

  /**
   * Handle click on highlight
   */
  private handleClick(e: MouseEvent): void {
    const target = e.target as HTMLElement;
    const highlightElement = target.closest('.error-highlight') as HTMLElement;
    
    if (highlightElement) {
      const lineNumber = parseInt(highlightElement.getAttribute('data-line') || '0');
      const highlight = this.currentHighlights.get(lineNumber);
      
      if (highlight && this.events.onHighlightClick) {
        this.events.onHighlightClick(highlight);
      }
    }
  }

  /**
   * Handle click on gutter
   */
  private handleGutterClick(e: MouseEvent): void {
    const target = e.target as HTMLElement;
    const gutterItem = target.closest('.error-gutter-item') as HTMLElement;
    
    if (gutterItem) {
      const lineNumber = parseInt(gutterItem.getAttribute('data-line') || '0');
      const highlight = this.currentHighlights.get(lineNumber);
      
      if (highlight && this.events.onHighlightClick) {
        this.events.onHighlightClick(highlight);
      }
    }
  }

  /**
   * Show tooltip for highlight
   */
  private showTooltip(highlight: LineHighlight, x: number, y: number): void {
    if (!this.tooltipElement || !this.config.showTooltips) return;

    let message = highlight.message;
    if (message.length > this.config.maxTooltipLength) {
      message = message.substring(0, this.config.maxTooltipLength) + '...';
    }

    // Add suggestions if available
    if (highlight.suggestions && highlight.suggestions.length > 0) {
      message += '\n\nSuggestions:\n• ' + highlight.suggestions.join('\n• ');
    }

    this.tooltipElement.textContent = message;
    this.tooltipElement.className = `error-highlight-tooltip tooltip-${highlight.type}`;
    
    // Position tooltip
    this.tooltipElement.style.left = `${x + 10}px`;
    this.tooltipElement.style.top = `${y - 10}px`;
    this.tooltipElement.style.display = 'block';

    // Adjust position if tooltip goes off screen
    const tooltipRect = this.tooltipElement.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    if (tooltipRect.right > viewportWidth) {
      this.tooltipElement.style.left = `${x - tooltipRect.width - 10}px`;
    }
    
    if (tooltipRect.bottom > viewportHeight) {
      this.tooltipElement.style.top = `${y - tooltipRect.height - 10}px`;
    }

    // Trigger event
    if (this.events.onTooltipShow) {
      this.events.onTooltipShow(highlight);
    }
  }

  /**
   * Hide tooltip
   */
  private hideTooltip(): void {
    if (!this.tooltipElement) return;

    this.tooltipElement.style.display = 'none';

    // Trigger event
    if (this.events.onTooltipHide) {
      // Get the last shown highlight (approximate)
      const highlights = this.getHighlights();
      if (highlights.length > 0) {
        this.events.onTooltipHide(highlights[0]);
      }
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<HighlightConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Re-render if configuration changed
    this.renderHighlights();
  }

  /**
   * Destroy the error highlighter and clean up
   */
  destroy(): void {
    // Clean up resize observer
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    // Remove tooltip from body
    if (this.tooltipElement && this.tooltipElement.parentElement) {
      this.tooltipElement.parentElement.removeChild(this.tooltipElement);
    }

    // Remove container and restore original structure
    if (this.container && this.container.parentElement) {
      this.container.parentElement.insertBefore(this.textArea, this.container);
      this.container.parentElement.removeChild(this.container);
    }

    // Clean up text area classes
    this.textArea.classList.remove('error-highlighter-textarea', 'with-line-numbers');

    // Clear references
    this.container = null;
    this.overlayElement = null;
    this.gutterElement = null;
    this.tooltipElement = null;
    this.currentHighlights.clear();
  }
}