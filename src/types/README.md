# TypeScript Type Definitions

This directory contains all the core TypeScript interfaces and types for the Ocarina Fingering Chart Web Application.

## Files Overview

### `core.ts`
- **Song**: Represents a song with title, note sequences, and optional metadata
- **FingeringPattern**: Defines fingering patterns for ocarina holes (4-hole layout)
- **ChartConfig**: Configuration for canvas-based chart rendering
- **LayoutInfo**: Layout calculations for responsive chart sizing

### `validation.ts`
- **ErrorType**: Enumeration of all possible error types
- **WarningType**: Enumeration of validation warning types
- **ValidationError**: Detailed error information with context
- **ValidationWarning**: Warning information for user notifications
- **ValidationResult**: Complete validation result with errors and warnings
- **SUPPORTED_NOTES**: Constant array of valid ocarina notes (F, G, A, Bb, C, D, E)
- **SupportedNote**: Type union of valid notes
- **ACCEPTED_FILE_TYPES**: Valid file types for upload

### `state.ts`
- **AppState**: Main application state interface
- **UIState**: UI-specific state for responsive layout
- **StateListener**: Function type for state change listeners
- **StateUpdate**: Partial state update type

### `examples.ts`
- **ExampleSong**: Structure for pre-defined example songs
- **ExampleCategory**: Categories for organizing examples

### `index.ts`
- Central export file providing access to all types

## Requirements Coverage

This implementation satisfies the following requirements:

- **Requirement 2.4**: Validation for notes outside supported range (F, G, A, Bb, C, D, E)
- **Requirement 8.1**: User-friendly error message display system
- **Requirement 8.3**: Highlighting and suggestions for unsupported notes

## Usage

```typescript
import type { Song, ValidationResult, AppState } from './types/index.js';
import { ErrorType, SUPPORTED_NOTES } from './types/index.js';

// Example usage
const song: Song = {
  title: 'My Song',
  lines: [['F', 'G', 'A']]
};

const validation: ValidationResult = {
  isValid: true,
  errors: [],
  warnings: []
};
```

## Type Safety

All types are designed with strict TypeScript compliance and include:
- Proper type annotations
- Readonly arrays where appropriate
- Optional properties with clear semantics
- Comprehensive error and validation types
- State management type safety