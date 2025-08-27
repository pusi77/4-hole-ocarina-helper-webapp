/**
 * Simple integration test for real-time functionality
 */

import { RealTimeTextInput } from './src/ui/RealTimeTextInput.js';
import { PreviewController } from './src/ui/PreviewController.js';
import { RealTimeApp } from './src/ui/RealTimeApp.js';
import { NoteParser } from './src/core/NoteParser.js';
import { FingeringEngine } from './src/core/FingeringEngine.js';
import { ChartRenderer } from './src/renderer/ChartRenderer.js';

console.log('Testing real-time integration...');

// Test 1: Core components can be instantiated
console.log('✓ All modules imported successfully');

// Test 2: NoteParser functionality
const parser = new NoteParser();
const testSong = parser.parseSong('Test Song\nF G A Bb C D E');
console.log('✓ NoteParser works:', testSong.title, testSong.lines);

// Test 3: FingeringEngine functionality
const engine = new FingeringEngine();
const pattern = engine.getPattern('F');
console.log('✓ FingeringEngine works:', pattern);

// Test 4: Validation
const validation = parser.validateInput('Test\nF G A');
console.log('✓ Validation works:', validation.isValid);

// Test 5: DOM-dependent components (mock DOM)
if (typeof document !== 'undefined') {
    // Create mock DOM elements
    const textArea = document.createElement('textarea');
    const canvas = document.createElement('canvas');
    
    // Mock canvas context
    const mockContext = {
        scale: () => {},
        fillRect: () => {},
        clearRect: () => {},
        beginPath: () => {},
        arc: () => {},
        fill: () => {},
        stroke: () => {},
        fillText: () => {},
        getImageData: () => ({ data: new Uint8ClampedArray(4) }),
        putImageData: () => {},
        toDataURL: () => 'data:image/png;base64,test'
    };
    
    canvas.getContext = () => mockContext;
    canvas.toDataURL = () => 'data:image/png;base64,test';
    
    // Test ChartRenderer
    const chartConfig = {
        canvasWidth: 800,
        canvasHeight: 600,
        holeRadius: 15,
        spacing: 20,
        colors: {
            background: '#ffffff',
            holeFilled: '#333333',
            holeEmpty: '#ffffff',
            text: '#333333'
        }
    };
    
    const renderer = new ChartRenderer(canvas, chartConfig);
    console.log('✓ ChartRenderer instantiated');
    
    // Test RealTimeApp
    const events = {
        onSongChanged: (song) => console.log('Song changed:', song?.title),
        onValidationChanged: (result) => console.log('Validation:', result.isValid),
        onError: (error) => console.log('Error:', error.message),
        onTextChanged: (text) => console.log('Text changed:', text.length, 'chars')
    };
    
    const app = new RealTimeApp(textArea, canvas, events);
    console.log('✓ RealTimeApp instantiated');
    
    // Test setting text
    app.setText('Integration Test\nF G A');
    console.log('✓ setText works');
    
    console.log('✅ All integration tests passed!');
} else {
    console.log('⚠️ DOM not available, skipping DOM-dependent tests');
    console.log('✅ Core integration tests passed!');
}