import { vi } from 'vitest';

// Mock DOM elements
export const createMockElement = (tagName: string): any => {
  const element: any = {
    tagName: tagName.toUpperCase(),
    value: '',
    style: {},
    classList: {
      add: vi.fn(),
      remove: vi.fn(),
      contains: vi.fn().mockReturnValue(false),
    },
    parentElement: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    focus: vi.fn(),
    blur: vi.fn(),
    click: vi.fn(),
    setAttribute: vi.fn(),
    getAttribute: vi.fn(),
    removeAttribute: vi.fn(),
    hasAttribute: vi.fn().mockReturnValue(false),
    appendChild: vi.fn(),
    removeChild: vi.fn(),
    insertBefore: vi.fn(),
    querySelectorAll: vi.fn().mockReturnValue([]),
    querySelector: vi.fn(),
    nextSibling: null,
    previousSibling: null,
    nodeType: 1, // Element node
    ownerDocument: {
      createElement: vi.fn().mockImplementation((tag: string) => createMockElement(tag)),
      getElementById: vi.fn(),
      head: {
        appendChild: vi.fn(),
      }
    }
  };

  // Set up parentElement with proper methods
  element.parentElement = {
    querySelector: vi.fn(),
    appendChild: vi.fn(),
    removeChild: vi.fn(),
    insertBefore: vi.fn(),
  };

  // Add canvas-specific methods if it's a canvas
  if (tagName.toLowerCase() === 'canvas') {
    element.width = 800;
    element.height = 600;
    element.getContext = vi.fn().mockReturnValue({
      scale: vi.fn(),
      fillRect: vi.fn(),
      fillText: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      clearRect: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      fillStyle: '',
      strokeStyle: '',
      font: '',
      textAlign: '',
      textBaseline: '',
      lineWidth: 0,
    });
    element.toDataURL = vi.fn().mockReturnValue('data:image/png;base64,test');
  }

  return element;
};

export const createMockElements = () => {
  const mockTextArea = createMockElement('textarea') as HTMLTextAreaElement;
  
  const mockCanvas = {
    ...createMockElement('canvas'),
    width: 800,
    height: 600,
    getContext: vi.fn().mockReturnValue({
      scale: vi.fn(),
      fillRect: vi.fn(),
      fillText: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      clearRect: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      fillStyle: '',
      strokeStyle: '',
      font: '',
      textAlign: '',
      textBaseline: '',
      lineWidth: 0,
    }),
    toDataURL: vi.fn().mockReturnValue('data:image/png;base64,test'),
  } as unknown as HTMLCanvasElement;

  const mockDropZone = createMockElement('div') as HTMLElement;
  const mockFileInput = createMockElement('input') as HTMLInputElement;
  const mockExportButton = createMockElement('button') as HTMLButtonElement;
  const mockNotificationContainer = createMockElement('div') as HTMLElement;

  return {
    textArea: mockTextArea,
    canvas: mockCanvas,
    dropZone: mockDropZone,
    fileInput: mockFileInput,
    exportButton: mockExportButton,
    notificationContainer: mockNotificationContainer,
  };
};
