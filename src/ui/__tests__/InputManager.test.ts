/**
 * Basic tests for InputManager
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InputManager } from '../InputManager.js';
import type { InputManagerEvents } from '../InputManager.js';

describe('InputManager', () => {
  let inputManager: InputManager;
  let mockEvents: InputManagerEvents;

  beforeEach(() => {
    vi.clearAllMocks();
    mockEvents = {
      onFileLoaded: vi.fn(),
      onTextInput: vi.fn(),
      onValidationResult: vi.fn(),
      onError: vi.fn()
    };
    inputManager = new InputManager(mockEvents);
  });

  it('should create an instance', () => {
    expect(inputManager).toBeInstanceOf(InputManager);
  });

  it('should handle text operations', () => {
    // InputManager needs to be initialized with a text area first
    const mockTextArea = {
      value: '',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    } as unknown as HTMLTextAreaElement;
    
    inputManager.initialize({ textArea: mockTextArea });
    
    const testText = 'Test Song\nF G A';
    inputManager.setText(testText);
    
    expect(mockTextArea.value).toBe(testText);
    expect(inputManager.getText()).toBe(testText);
  });

  it('should clear text', () => {
    inputManager.setText('Some text');
    inputManager.clear();
    
    expect(inputManager.getText()).toBe('');
  });

  it('should trigger file picker', () => {
    expect(() => inputManager.triggerFilePicker()).not.toThrow();
  });

  it('should get all examples', () => {
    const examples = inputManager.getAllExamples();
    expect(Array.isArray(examples)).toBe(true);
  });

  it('should clear example selection', () => {
    expect(() => inputManager.clearExampleSelection()).not.toThrow();
  });

  it('should destroy properly', () => {
    expect(() => inputManager.destroy()).not.toThrow();
  });
});
