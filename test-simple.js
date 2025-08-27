// Simple test to verify the fix
import { NoteParser } from './src/core/NoteParser.js';

const parser = new NoteParser();

// Test 1: Original format (title + notation)
console.log('=== Test 1: Original format ===');
const originalInput = `Test Song
F G A F
G A C D`;

try {
  const song1 = parser.parseSong(originalInput);
  console.log('✓ Title:', song1.title);
  console.log('✓ Lines:', song1.lines.length);
  console.log('✓ Line 1:', song1.lines[0]);
  console.log('✓ Line 2:', song1.lines[1]);
} catch (error) {
  console.error('✗ Error:', error.message);
}

// Test 2: New format (notation only, but we'll simulate the title combination)
console.log('\n=== Test 2: Simulated new format ===');
const title = 'Test Song';
const notation = `F G A F
G A C D`;
const combinedInput = title + '\n' + notation;

try {
  const song2 = parser.parseSong(combinedInput);
  console.log('✓ Title:', song2.title);
  console.log('✓ Lines:', song2.lines.length);
  console.log('✓ Line 1:', song2.lines[0]);
  console.log('✓ Line 2:', song2.lines[1]);

  // Check if first line is missing
  if (song2.lines[0] && song2.lines[0].length > 0) {
    console.log('✓ SUCCESS: First line is rendered correctly!');
  } else {
    console.log('✗ FAILURE: First line is missing!');
  }
} catch (error) {
  console.error('✗ Error:', error.message);
}

// Test 3: Edge case - empty title
console.log('\n=== Test 3: Empty title ===');
const emptyTitleInput = `
F G A F`;

try {
  const song3 = parser.parseSong(emptyTitleInput);
  console.log('✓ Title:', song3.title);
  console.log('✓ Lines:', song3.lines.length);
  console.log('✓ Line 1:', song3.lines[0]);
} catch (error) {
  console.error('✗ Error:', error.message);
}
