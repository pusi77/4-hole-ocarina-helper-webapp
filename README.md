! Disclaimer: everything was vibe-coded with Claude

# Ocarina Fingering Chart Web Application

A static web application that generates visual fingering charts for 4-hole ocarinas from text-based song notation.

## Development Setup

This project uses Vite with TypeScript for fast development and optimized builds.

### Prerequisites

- Node.js (v18 or higher)
- npm

### Installation

```bash
npm install
```

### Development Scripts

- `npm run dev` - Start development server on port 3000
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues automatically
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting
- `npm run type-check` - Run TypeScript type checking

### Project Structure

```
src/
├── types/      # TypeScript type definitions
├── core/       # Core business logic (parsing, fingering patterns)
├── renderer/   # Canvas-based chart rendering
├── ui/         # UI components and controllers
├── utils/      # Utility functions
├── styles/     # CSS styles
└── main.ts     # Application entry point
```

### Technology Stack

- **Vite** - Build tool and development server
- **TypeScript** - Type-safe JavaScript
- **Canvas API** - Chart rendering
- **ESLint** - Code linting
- **Prettier** - Code formatting

## Features

- Text-based song notation input
- Real-time fingering chart generation
- File upload and drag-and-drop support
- PNG export functionality
- Responsive design for mobile and desktop
- Example songs included
- Accessibility features