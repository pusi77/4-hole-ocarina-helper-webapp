import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import prettier from 'eslint-plugin-prettier';

export default [
  js.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      globals: {
        // DOM globals
        document: 'readonly',
        window: 'readonly',
        console: 'readonly',
        alert: 'readonly',
        navigator: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        getComputedStyle: 'readonly',
        
        // Timing functions
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',
        
        // Performance API
        performance: 'readonly',
        PerformanceObserver: 'readonly',
        
        // HTML Elements
        HTMLElement: 'readonly',
        HTMLDivElement: 'readonly',
        HTMLButtonElement: 'readonly',
        HTMLCanvasElement: 'readonly',
        HTMLInputElement: 'readonly',
        HTMLTextAreaElement: 'readonly',
        HTMLSelectElement: 'readonly',
        NodeListOf: 'readonly',
        
        // Canvas & Graphics
        CanvasRenderingContext2D: 'readonly',
        ImageData: 'readonly',
        
        // File APIs
        FileList: 'readonly',
        File: 'readonly',
        FileReader: 'readonly',
        Blob: 'readonly',
        
        // Events
        Event: 'readonly',
        DragEvent: 'readonly',
        MouseEvent: 'readonly',
        KeyboardEvent: 'readonly',
        FocusEvent: 'readonly',
        ClipboardEvent: 'readonly',
        CustomEvent: 'readonly',
        
        // Observers
        ResizeObserver: 'readonly',
        MutationObserver: 'readonly',
        
        // Service Workers
        ServiceWorkerRegistration: 'readonly',
        
        // Test globals
        testUtils: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': typescript,
      prettier: prettier,
    },
    rules: {
      'prettier/prettier': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_'
      }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'off', // Allow any types for flexibility
      'no-unused-vars': 'off', // Use TypeScript version instead
      'no-useless-escape': 'error',
      'no-prototype-builtins': 'error',
      'no-undef': 'error',
    },
  },
  {
    ignores: ['node_modules/', 'dist/', '*.config.js', '*.config.ts'],
  },
];