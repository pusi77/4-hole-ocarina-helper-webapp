/**
 * Basic tests for ErrorHandlingManager
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ErrorHandlingManager } from '../ErrorHandlingManager.js';
import { ErrorType, WarningType } from '../../types/index.js';
import type {
  ValidationError,
  ValidationWarning,
  ValidationResult,
} from '../../types/index.js';

describe('ErrorHandlingManager', () => {
  let errorManager: ErrorHandlingManager;

  beforeEach(() => {
    vi.clearAllMocks();
    errorManager = new ErrorHandlingManager();
  });

  it('should create an instance', () => {
    expect(errorManager).toBeInstanceOf(ErrorHandlingManager);
  });

  it('should handle valid validation result', async () => {
    const validResult: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    const result = await errorManager.handleValidationResult(
      validResult,
      {},
      'test input'
    );
    expect(result.handled).toBe(true);
  });

  it('should handle validation errors', async () => {
    const error: ValidationError = {
      type: ErrorType.UNSUPPORTED_NOTE,
      message: 'Unsupported note',
      line: 1,
      suggestions: ['F', 'G', 'A'],
    };

    const errorResult: ValidationResult = {
      isValid: false,
      errors: [error],
      warnings: [],
    };

    const result = await errorManager.handleValidationResult(
      errorResult,
      {},
      'test input'
    );
    expect(result.handled).toBe(true);
  });

  it('should handle validation warnings', async () => {
    const warning: ValidationWarning = {
      type: WarningType.NOTE_CONVERSION,
      message: 'Note converted',
      line: 1,
    };

    const warningResult: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [warning],
    };

    const result = await errorManager.handleValidationResult(
      warningResult,
      {},
      'test input'
    );
    expect(result.handled).toBe(true);
  });

  it('should clear errors', () => {
    expect(() => errorManager.clearErrors()).not.toThrow();
  });
});
