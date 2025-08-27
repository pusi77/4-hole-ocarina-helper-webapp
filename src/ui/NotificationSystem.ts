/**
 * NotificationSystem - Handles user feedback through notifications
 * Provides error messages, success notifications, and warnings
 */

import type { ValidationError, ValidationWarning } from '../types/index.js';
import { ErrorType, WarningType } from '../types/index.js';

/**
 * Notification types for different user feedback scenarios
 */
export enum NotificationType {
  ERROR = 'error',
  WARNING = 'warning',
  SUCCESS = 'success',
  INFO = 'info'
}

/**
 * Configuration for notification display
 */
export interface NotificationConfig {
  autoHide: boolean;
  hideDelay: number; // in milliseconds
  maxNotifications: number;
  position: 'top' | 'bottom';
  showIcons: boolean;
  allowDismiss: boolean;
}

/**
 * Individual notification data
 */
export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  autoHide: boolean;
  hideDelay: number;
  actions?: NotificationAction[];
  metadata?: Record<string, any>;
}

/**
 * Action buttons for notifications
 */
export interface NotificationAction {
  label: string;
  action: () => void;
  style?: 'primary' | 'secondary' | 'danger';
}

/**
 * Event handlers for notification system
 */
export interface NotificationEvents {
  onNotificationAdded?: (notification: Notification) => void;
  onNotificationRemoved?: (notificationId: string) => void;
  onNotificationClicked?: (notification: Notification) => void;
  onActionClicked?: (notification: Notification, action: NotificationAction) => void;
}

/**
 * NotificationSystem manages user feedback and notifications
 */
export class NotificationSystem {
  private container: HTMLElement | null = null;
  private notifications: Map<string, Notification> = new Map();
  private config: NotificationConfig;
  private events: NotificationEvents;
  private hideTimeouts: Map<string, ReturnType<typeof setTimeout>> = new Map();

  constructor(events: NotificationEvents = {}, config?: Partial<NotificationConfig>) {
    this.events = events;
    this.config = {
      autoHide: true,
      hideDelay: 5000,
      maxNotifications: 5,
      position: 'top',
      showIcons: true,
      allowDismiss: true,
      ...config
    };
  }

  /**
   * Initialize the notification system with a container element
   */
  initialize(container: HTMLElement): void {
    this.container = container;
    this.setupContainer();
  }

  /**
   * Show an error notification from ValidationError
   */
  showError(error: ValidationError): string {
    const title = this.getErrorTitle(error.type);
    const message = this.formatErrorMessage(error);
    
    const actions: NotificationAction[] = [];
    
    // Add suggestion actions if available
    if (error.suggestions && error.suggestions.length > 0) {
      actions.push({
        label: 'Show Help',
        action: () => this.showErrorHelp(error),
        style: 'secondary'
      });
    }

    return this.show({
      type: NotificationType.ERROR,
      title,
      message,
      autoHide: false, // Errors should be manually dismissed
      hideDelay: 0,
      actions,
      metadata: { error }
    });
  }

  /**
   * Show a warning notification from ValidationWarning
   */
  showWarning(warning: ValidationWarning): string {
    const title = this.getWarningTitle(warning.type);
    const message = this.formatWarningMessage(warning);
    
    return this.show({
      type: NotificationType.WARNING,
      title,
      message,
      autoHide: true,
      hideDelay: 4000,
      metadata: { warning }
    });
  }

  /**
   * Show a success notification
   */
  showSuccess(title: string, message: string, options?: Partial<Notification>): string {
    return this.show({
      type: NotificationType.SUCCESS,
      title,
      message,
      autoHide: true,
      hideDelay: 3000,
      ...options
    });
  }

  /**
   * Show an info notification
   */
  showInfo(title: string, message: string, options?: Partial<Notification>): string {
    return this.show({
      type: NotificationType.INFO,
      title,
      message,
      autoHide: true,
      hideDelay: 4000,
      ...options
    });
  }

  /**
   * Show a generic notification
   */
  show(notification: Partial<Notification>): string {
    if (!this.container) {
      console.warn('NotificationSystem not initialized with container');
      return '';
    }

    const id = this.generateId();
    const fullNotification: Notification = {
      id,
      type: NotificationType.INFO,
      title: 'Notification',
      message: '',
      timestamp: new Date(),
      autoHide: this.config.autoHide,
      hideDelay: this.config.hideDelay,
      ...notification
    };

    // Enforce max notifications limit before adding new one
    while (this.notifications.size >= this.config.maxNotifications) {
      const oldest = Array.from(this.notifications.values())
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())[0];
      if (oldest) {
        this.hide(oldest.id);
      } else {
        break; // Safety break
      }
    }

    // Add to notifications map
    this.notifications.set(id, fullNotification);

    // Create and add DOM element
    const element = this.createNotificationElement(fullNotification);
    this.container.appendChild(element);

    // Set up auto-hide if enabled
    if (fullNotification.autoHide && fullNotification.hideDelay > 0) {
      const timeout = setTimeout(() => {
        this.hide(id);
      }, fullNotification.hideDelay);
      this.hideTimeouts.set(id, timeout);
    }

    // Trigger event
    if (this.events.onNotificationAdded) {
      this.events.onNotificationAdded(fullNotification);
    }

    return id;
  }

  /**
   * Hide a specific notification
   */
  hide(notificationId: string): void {
    const notification = this.notifications.get(notificationId);
    if (!notification) return;

    // Clear timeout if exists
    const timeout = this.hideTimeouts.get(notificationId);
    if (timeout) {
      clearTimeout(timeout);
      this.hideTimeouts.delete(notificationId);
    }

    // Remove from DOM
    const element = this.container?.querySelector(`[data-notification-id="${notificationId}"]`);
    if (element) {
      element.classList.add('notification-hiding');
      setTimeout(() => {
        element.remove();
      }, 300); // Match CSS transition duration
    }

    // Remove from notifications map
    this.notifications.delete(notificationId);

    // Trigger event
    if (this.events.onNotificationRemoved) {
      this.events.onNotificationRemoved(notificationId);
    }
  }

  /**
   * Hide all notifications
   */
  hideAll(): void {
    const notificationIds = Array.from(this.notifications.keys());
    notificationIds.forEach(id => this.hide(id));
  }

  /**
   * Hide all notifications of a specific type
   */
  hideByType(type: NotificationType): void {
    const notificationsToHide = Array.from(this.notifications.values())
      .filter(n => n.type === type)
      .map(n => n.id);
    
    notificationsToHide.forEach(id => this.hide(id));
  }

  /**
   * Get all current notifications
   */
  getNotifications(): Notification[] {
    return Array.from(this.notifications.values());
  }

  /**
   * Get notifications by type
   */
  getNotificationsByType(type: NotificationType): Notification[] {
    return this.getNotifications().filter(n => n.type === type);
  }

  /**
   * Check if there are any error notifications
   */
  hasErrors(): boolean {
    return this.getNotificationsByType(NotificationType.ERROR).length > 0;
  }

  /**
   * Clear all error notifications
   */
  clearErrors(): void {
    this.hideByType(NotificationType.ERROR);
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<NotificationConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Update container if position changed
    if (this.container && config.position) {
      this.setupContainer();
    }
  }

  /**
   * Set up the notification container
   */
  private setupContainer(): void {
    if (!this.container) return;

    this.container.className = `notification-container notification-${this.config.position}`;
    this.container.setAttribute('aria-live', 'polite');
    this.container.setAttribute('aria-atomic', 'false');
    this.container.setAttribute('role', 'status');
  }

  /**
   * Create DOM element for notification
   */
  private createNotificationElement(notification: Notification): HTMLElement {
    const element = document.createElement('div');
    element.className = `notification notification-${notification.type}`;
    element.setAttribute('data-notification-id', notification.id);
    element.setAttribute('role', 'alert');
    element.setAttribute('aria-live', 'assertive');

    const icon = this.config.showIcons ? this.getNotificationIcon(notification.type) : '';
    
    element.innerHTML = `
      <div class="notification-content">
        ${icon ? `<div class="notification-icon">${icon}</div>` : ''}
        <div class="notification-text">
          <div class="notification-title">${this.escapeHtml(notification.title)}</div>
          <div class="notification-message">${this.escapeHtml(notification.message)}</div>
        </div>
        ${this.config.allowDismiss ? '<button class="notification-dismiss" aria-label="Dismiss notification">&times;</button>' : ''}
      </div>
      ${notification.actions && notification.actions.length > 0 ? this.createActionsHtml(notification.actions) : ''}
    `;

    // Set up event listeners
    this.setupNotificationEvents(element, notification);

    return element;
  }

  /**
   * Create HTML for notification actions
   */
  private createActionsHtml(actions: NotificationAction[]): string {
    const actionsHtml = actions.map(action => 
      `<button class="notification-action notification-action-${action.style || 'secondary'}" data-action="${this.escapeHtml(action.label)}">${this.escapeHtml(action.label)}</button>`
    ).join('');

    return `<div class="notification-actions">${actionsHtml}</div>`;
  }

  /**
   * Set up event listeners for notification element
   */
  private setupNotificationEvents(element: HTMLElement, notification: Notification): void {
    // Dismiss button
    const dismissBtn = element.querySelector('.notification-dismiss');
    if (dismissBtn) {
      dismissBtn.addEventListener('click', () => {
        this.hide(notification.id);
      });
    }

    // Action buttons
    const actionButtons = element.querySelectorAll('.notification-action');
    actionButtons.forEach((button, index) => {
      button.addEventListener('click', () => {
        const action = notification.actions?.[index];
        if (action) {
          action.action();
          if (this.events.onActionClicked) {
            this.events.onActionClicked(notification, action);
          }
        }
      });
    });

    // Click on notification
    element.addEventListener('click', (e) => {
      // Don't trigger if clicking on dismiss or action buttons
      if ((e.target as HTMLElement).closest('.notification-dismiss, .notification-action')) {
        return;
      }
      
      if (this.events.onNotificationClicked) {
        this.events.onNotificationClicked(notification);
      }
    });
  }

  /**
   * Get appropriate title for error type
   */
  private getErrorTitle(errorType: ErrorType): string {
    switch (errorType) {
      case ErrorType.INVALID_FILE_TYPE:
        return 'Invalid File Type';
      case ErrorType.UNSUPPORTED_NOTE:
        return 'Unsupported Note';
      case ErrorType.EMPTY_INPUT:
        return 'Empty Input';
      case ErrorType.PARSING_ERROR:
        return 'Parsing Error';
      case ErrorType.RENDERING_ERROR:
        return 'Rendering Error';
      case ErrorType.EXPORT_ERROR:
        return 'Export Error';
      default:
        return 'Error';
    }
  }

  /**
   * Get appropriate title for warning type
   */
  private getWarningTitle(warningType: WarningType): string {
    switch (warningType) {
      case WarningType.NOTE_CONVERSION:
        return 'Note Converted';
      case WarningType.EMPTY_LINE:
        return 'Empty Line';
      case WarningType.PERFORMANCE_WARNING:
        return 'Performance Warning';
      default:
        return 'Warning';
    }
  }

  /**
   * Format error message with context
   */
  private formatErrorMessage(error: ValidationError): string {
    let message = error.message;
    
    if (error.line !== undefined) {
      message += ` (Line ${error.line}`;
      if (error.position !== undefined) {
        message += `, Position ${error.position}`;
      }
      message += ')';
    }

    return message;
  }

  /**
   * Format warning message with context
   */
  private formatWarningMessage(warning: ValidationWarning): string {
    let message = warning.message;
    
    if (warning.line !== undefined) {
      message += ` (Line ${warning.line}`;
      if (warning.position !== undefined) {
        message += `, Position ${warning.position}`;
      }
      message += ')';
    }

    return message;
  }

  /**
   * Show detailed error help
   */
  private showErrorHelp(error: ValidationError): void {
    if (!error.suggestions || error.suggestions.length === 0) return;

    const helpMessage = error.suggestions.join('\n• ');
    
    this.showInfo(
      'How to Fix This Error',
      `• ${helpMessage}`,
      {
        autoHide: false,
        actions: [{
          label: 'Got It',
          action: () => {}, // Will auto-dismiss
          style: 'primary'
        }]
      }
    );
  }

  /**
   * Get icon for notification type
   */
  private getNotificationIcon(type: NotificationType): string {
    switch (type) {
      case NotificationType.ERROR:
        return '⚠️';
      case NotificationType.WARNING:
        return '⚡';
      case NotificationType.SUCCESS:
        return '✅';
      case NotificationType.INFO:
        return 'ℹ️';
      default:
        return '';
    }
  }



  /**
   * Generate unique notification ID
   */
  private generateId(): string {
    return `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Escape HTML to prevent XSS
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Destroy the notification system and clean up
   */
  destroy(): void {
    // Clear all timeouts
    this.hideTimeouts.forEach(timeout => clearTimeout(timeout));
    this.hideTimeouts.clear();

    // Clear all notifications
    this.notifications.clear();

    // Clear container
    if (this.container) {
      this.container.innerHTML = '';
      this.container = null;
    }
  }
}