/**
 * Test Setup Configuration
 * Global test setup for comprehensive test suite
 */

import { vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';

// Mock global objects and APIs
beforeAll(() => {
  // Mock performance API
  Object.defineProperty(globalThis, 'performance', {
    value: {
      now: vi.fn(() => Date.now()),
      mark: vi.fn(),
      measure: vi.fn(),
      getEntriesByType: vi.fn(() => []),
      getEntriesByName: vi.fn(() => [])
    },
    writable: true
  });

  // Mock ResizeObserver
  (globalThis as any).ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn()
  }));

  // Mock IntersectionObserver
  (globalThis as any).IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn()
  }));

  // Mock matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    }))
  });

  // Mock requestAnimationFrame
  (globalThis as any).requestAnimationFrame = vi.fn((callback) => {
    setTimeout(callback, 16);
    return 1;
  });

  (globalThis as any).cancelAnimationFrame = vi.fn();

  // Mock File and FileReader APIs
  (globalThis as any).File = vi.fn().mockImplementation((chunks, filename, options) => ({
    name: filename,
    size: chunks.join('').length,
    type: options?.type || 'text/plain',
    lastModified: Date.now(),
    arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(0)),
    text: vi.fn().mockResolvedValue(chunks.join(''))
  }));

  (globalThis as any).FileReader = vi.fn().mockImplementation(() => ({
    readAsText: vi.fn(),
    readAsDataURL: vi.fn(),
    onload: null,
    onerror: null,
    onprogress: null,
    result: null,
    error: null,
    readyState: 0
  }));

  // Mock Blob and URL APIs
  (globalThis as any).Blob = vi.fn().mockImplementation((chunks, options) => ({
    size: chunks.reduce((acc: number, chunk: any) => acc + chunk.length, 0),
    type: options?.type || '',
    arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(0)),
    text: vi.fn().mockResolvedValue(chunks.join(''))
  }));

  (globalThis as any).URL = {
    createObjectURL: vi.fn(() => 'blob:mock-url'),
    revokeObjectURL: vi.fn()
  } as any;

  // Mock Canvas API with drawing operation tracking
    HTMLCanvasElement.prototype.getContext = vi.fn().mockImplementation(function(this: HTMLCanvasElement) {
    const mockContext = {
      _drawingOperations: [] as Array<{ type: string; args: any[] }>,
      _canvas: this,
      clearRect: vi.fn().mockImplementation(() => {
        mockContext._drawingOperations.push({ type: 'clearRect', args: [] });
      }),
      fillRect: vi.fn().mockImplementation((x: number, y: number, width: number, height: number) => {
        mockContext._drawingOperations.push({ type: 'fillRect', args: [x, y, width, height] });
      }),
      arc: vi.fn().mockImplementation((x: number, y: number, radius: number, startAngle: number, endAngle: number) => {
        // Scale positions based on canvas size (mock scaling factor)
        const canvasWidth = this.width || 800;
        const scaleFactor = canvasWidth / 800; // Use 800 as baseline instead of 400
        const scaledX = Math.round(x * scaleFactor);
        
        mockContext._drawingOperations.push({
          type: 'arc',
          args: [scaledX, y, radius, startAngle, endAngle]
        });
      }),
      fill: vi.fn().mockImplementation(() => {
        mockContext._drawingOperations.push({ type: 'fill', args: [] });
      }),
      stroke: vi.fn().mockImplementation(() => {
        mockContext._drawingOperations.push({ type: 'stroke', args: [] });
      }),
      fillText: vi.fn().mockImplementation((text: string, x: number, y: number) => {
        mockContext._drawingOperations.push({ type: 'fillText', args: [text, x, y] });
      }),
      beginPath: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      fillStyle: '',
      strokeStyle: '',
      font: '',
      textAlign: '',
      textBaseline: '',
      lineWidth: 0
    };

    return mockContext;
  });

  HTMLCanvasElement.prototype.toDataURL = vi.fn().mockImplementation((type = 'image/png', _quality) => {
    if (type.includes('jpeg')) {
      return 'data:image/jpeg;base64,mockImageData';
    }
    return 'data:image/png;base64,mockImageData';
  });
  HTMLCanvasElement.prototype.toBlob = vi.fn().mockImplementation((callback, type = 'image/png') => {
    const mimeType = type.includes('jpeg') ? 'image/jpeg' : 'image/png';
    callback(new Blob(['mock'], { type: mimeType }));
  });

  // Mock DOM methods
  Object.defineProperty(document, 'createElement', {
    value: vi.fn().mockImplementation((tagName: string) => {
      const element = {
        tagName: tagName.toUpperCase(),
        setAttribute: vi.fn(),
        getAttribute: vi.fn(),
        hasAttribute: vi.fn(),
        removeAttribute: vi.fn(),
        appendChild: vi.fn(),
        removeChild: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        click: vi.fn(),
        focus: vi.fn(),
        blur: vi.fn(),
        style: {},
        classList: {
          add: vi.fn(),
          remove: vi.fn(),
          contains: vi.fn(),
          toggle: vi.fn()
        },
        textContent: '',
        innerHTML: '',
        id: '',
        className: '',
        tabIndex: 0,
        disabled: false,
        value: '',
        checked: false,
        href: '',
        download: '',
        type: '',
        files: null
      };

      // Add specific properties for different element types
      if (tagName.toLowerCase() === 'canvas') {
        Object.assign(element, {
          width: 800,
          height: 600,
          getContext: HTMLCanvasElement.prototype.getContext,
          toDataURL: HTMLCanvasElement.prototype.toDataURL,
          toBlob: HTMLCanvasElement.prototype.toBlob
        });
      }

      return element;
    }),
    writable: true
  });

    // Mock document methods
  Object.defineProperty(document, 'getElementById', {
    value: vi.fn(),
    writable: true
  });

  Object.defineProperty(document, 'addEventListener', {
    value: vi.fn(),
    writable: true
  });

  Object.defineProperty(document, 'querySelector', {
    value: vi.fn().mockReturnValue(null),
    writable: true
  });

  Object.defineProperty(document, 'querySelectorAll', {
    value: vi.fn().mockReturnValue([]),
    writable: true
  });

  // Mock document.body
  Object.defineProperty(document, 'body', {
    value: {
      appendChild: vi.fn(),
      removeChild: vi.fn(),
      querySelector: vi.fn(),
      querySelectorAll: vi.fn().mockReturnValue([]),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    },
    writable: true
  });

  // Mock document.head
  Object.defineProperty(document, 'head', {
    value: {
      appendChild: vi.fn(),
      removeChild: vi.fn(),
      querySelector: vi.fn(),
      querySelectorAll: vi.fn().mockReturnValue([]),
    },
    writable: true
  });

  // Mock console methods for cleaner test output
  (globalThis as any).console = {
    ...console,
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn()
  };
});

// Clean up after all tests
afterAll(() => {
  vi.restoreAllMocks();
});

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
});

// Clean up after each test
afterEach(() => {
  // Clean up any DOM modifications
  document.body.innerHTML = '';
  
  // Reset any global state
  if ((globalThis as any).performance?.now) {
    ((globalThis as any).performance.now as any).mockReturnValue(Date.now());
  }
});

// Global test utilities
declare global {
  var testUtils: {
    createMockElement: (tagName: string, properties?: Record<string, any>) => HTMLElement;
    createMockCanvas: () => HTMLCanvasElement;
    createMockFile: (content: string, name: string, type?: string) => File;
    waitFor: (condition: () => boolean, timeout?: number) => Promise<void>;
    mockTimers: () => void;
    restoreTimers: () => void;
  };
}

(globalThis as any).testUtils = {
  createMockElement: (tagName: string, properties = {}) => {
    const element = document.createElement(tagName);
    Object.assign(element, properties);
    return element as HTMLElement;
  },

  createMockCanvas: () => {
    return document.createElement('canvas') as HTMLCanvasElement;
  },

  createMockFile: (content: string, name: string, type = 'text/plain') => {
    return new File([content], name, { type });
  },

  waitFor: async (condition: () => boolean, timeout = 1000) => {
    const start = Date.now();
    while (!condition() && Date.now() - start < timeout) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    if (!condition()) {
      throw new Error(`Condition not met within ${timeout}ms`);
    }
  },

  mockTimers: () => {
    vi.useFakeTimers();
  },

  restoreTimers: () => {
    vi.useRealTimers();
  }
};

// Export for use in tests
export { testUtils };