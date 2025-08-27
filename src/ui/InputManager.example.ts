/**
 * Example usage of InputManager with example songs functionality
 * This demonstrates how to integrate the example songs system
 */

import { InputManager, type InputManagerEvents } from './InputManager.js';
import type {
  ValidationResult,
  ValidationError,
  ExampleSong,
} from '../types/index.js';

// Example implementation showing how to use InputManager with examples
export function createInputManagerWithExamples(): InputManager {
  // Define event handlers
  const events: InputManagerEvents = {
    onFileLoaded: (content: string, filename: string) => {
      console.log(`File loaded: ${filename}`);
      console.log(`Content: ${content.substring(0, 100)}...`);
    },

    onTextInput: (text: string) => {
      console.log(`Text input changed: ${text.length} characters`);
    },

    onValidationResult: (result: ValidationResult) => {
      if (result.isValid) {
        console.log('Input is valid');
      } else {
        console.log('Validation errors:', result.errors);
      }
    },

    onError: (error: ValidationError) => {
      console.error('Input error:', error.message);
    },

    onExampleLoaded: (notation: string, title: string) => {
      console.log(`Example loaded: ${title}`);
      console.log(`Notation: ${notation}`);
    },

    onExampleSelected: (song: ExampleSong) => {
      console.log(`Example selected: ${song.title} (${song.difficulty})`);
      console.log(`Description: ${song.description}`);
    },
  };

  // Create InputManager instance
  const inputManager = new InputManager(events);

  return inputManager;
}

// Example HTML structure for the example songs system
export const exampleHTML = `
<div class="input-section">
  <!-- File input area -->
  <div id="drop-zone" class="drop-zone">
    <p>Drop text files here or click to select</p>
    <input type="file" id="file-input" accept=".txt,text/plain" style="display: none;">
    <button type="button" onclick="document.getElementById('file-input').click()">
      Choose File
    </button>
  </div>

  <!-- Example songs section -->
  <div id="example-container" class="example-container">
    <!-- ExampleLoader will render its content here -->
  </div>

  <!-- Text input area -->
  <div class="text-input-section">
    <label for="text-input">Or enter notation directly:</label>
    <textarea 
      id="text-input" 
      placeholder="Enter song notation here...
Example:
Song Title
F G A Bb C D E
E D C Bb A G F"
      rows="10"
      cols="50">
    </textarea>
  </div>
</div>
`;

// Example initialization function
export function initializeExampleSystem(): void {
  // Create InputManager
  const inputManager = createInputManagerWithExamples();

  // Get DOM elements
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input') as HTMLInputElement;
  const textArea = document.getElementById('text-input') as HTMLTextAreaElement;
  const exampleContainer = document.getElementById('example-container');

  // Initialize InputManager with all elements
  if (dropZone && fileInput && textArea && exampleContainer) {
    inputManager.initialize({
      dropZone,
      fileInput,
      textArea,
      exampleContainer,
    });

    console.log('Example songs system initialized successfully!');

    // Demonstrate loading an example
    setTimeout(() => {
      console.log('Loading Simple Melody example...');
      inputManager.loadExample('simple-melody');
    }, 1000);
  } else {
    console.error('Required DOM elements not found');
  }
}

// Example of programmatic usage
export function demonstrateExampleUsage(): void {
  const inputManager = createInputManagerWithExamples();

  // Mock DOM elements for demonstration
  const mockElements = {
    dropZone: document.createElement('div'),
    fileInput: document.createElement('input') as HTMLInputElement,
    textArea: document.createElement('textarea') as HTMLTextAreaElement,
    exampleContainer: document.createElement('div'),
  };

  inputManager.initialize(mockElements);

  // Get all available examples
  const allExamples = inputManager.getAllExamples();
  console.log(`Available examples: ${allExamples.length}`);

  allExamples.forEach((song) => {
    console.log(`- ${song.title} (${song.difficulty}): ${song.description}`);
  });

  // Load specific examples
  console.log('\nLoading examples:');

  // Load Mary Had a Little Lamb
  setTimeout(() => {
    inputManager.loadExample('mary-had-little-lamb');
  }, 500);

  // Load Simple Scale
  setTimeout(() => {
    inputManager.loadExample('simple-scale');
  }, 1000);

  // Clean up
  setTimeout(() => {
    inputManager.destroy();
    console.log('InputManager destroyed');
  }, 2000);
}

// Export for use in other modules
export { InputManager, type InputManagerEvents };
