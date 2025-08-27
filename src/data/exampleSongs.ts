/**
 * Example songs data for the Ocarina Fingering Chart Web Application
 * Contains pre-defined songs to demonstrate proper notation format
 */

import type { ExampleSong } from '../types/examples.js';
import { ExampleCategory } from '../types/examples.js';

/**
 * Collection of example songs organized by category
 */
export const EXAMPLE_SONGS: Record<ExampleCategory, ExampleSong[]> = {
  [ExampleCategory.SCALES]: [
    {
      id: 'simple-scale',
      title: 'Simple Scale',
      description: 'Basic scale progression using all supported notes',
      notation: `Simple Scale
F G A Bb C D E
E D C Bb A G F`,
      difficulty: 'beginner'
    },
    {
      id: 'all-notes-test',
      title: 'All Notes Test',
      description: 'Test pattern showing all fingering positions',
      notation: `All Notes Test
F F G G A A Bb Bb
C C D D E E
E D C Bb A G F`,
      difficulty: 'beginner'
    }
  ],

  [ExampleCategory.SIMPLE_SONGS]: [
    {
      id: 'mary-had-little-lamb',
      title: 'Mary Had a Little Lamb',
      description: 'Classic children\'s song with simple melody',
      notation: `Mary Had a Little Lamb
A G F G A A A
G G G A C C
A G F G A A A
G G A G F`,
      difficulty: 'beginner'
    },
    {
      id: 'twinkle-twinkle',
      title: 'Twinkle Twinkle Little Star',
      description: 'Popular nursery rhyme with repetitive pattern',
      notation: `Twinkle Twinkle Little Star
C C G G A A G
F F E E D D C
G G F F E E D
G G F F E E D
C C G G A A G
F F E E D D C`,
      difficulty: 'beginner'
    }
  ],

  [ExampleCategory.POPULAR_SONGS]: [
    {
      id: 'simple-melody',
      title: 'Simple Melody',
      description: 'A basic melody using common notes',
      notation: `Simple Melody
F G A F
G A C D`,
      difficulty: 'beginner'
    },
    {
      id: 'song-of-time',
      title: 'Song of Time',
      description: 'Iconic melody from The Legend of Zelda series',
      notation: `Song of Time
A D F A D F
A D F A D F`,
      difficulty: 'intermediate'
    }
  ],

  [ExampleCategory.TESTS]: [
    {
      id: 'note-conversion-test',
      title: 'Note Conversion Test',
      description: 'Demonstrates automatic B to Bb conversion',
      notation: `Note Conversion Test
F G A B C D E
B B B A A A
C B A G F`,
      difficulty: 'beginner'
    },
    {
      id: 'complex-rhythm',
      title: 'Complex Rhythm Test',
      description: 'Tests parsing of varied line lengths and patterns',
      notation: `Complex Rhythm Test
F G A
Bb C D E
F F G G A A
Bb Bb C C D D E E
F G A Bb C D E F G A`,
      difficulty: 'intermediate'
    }
  ]
};

/**
 * Get all example songs as a flat array
 */
export function getAllExampleSongs(): ExampleSong[] {
  return Object.values(EXAMPLE_SONGS).flat();
}

/**
 * Get example songs by category
 */
export function getExamplesByCategory(category: ExampleCategory): ExampleSong[] {
  return EXAMPLE_SONGS[category] || [];
}

/**
 * Get example song by ID
 */
export function getExampleById(id: string): ExampleSong | undefined {
  return getAllExampleSongs().find(song => song.id === id);
}

/**
 * Get example songs by difficulty
 */
export function getExamplesByDifficulty(difficulty: ExampleSong['difficulty']): ExampleSong[] {
  return getAllExampleSongs().filter(song => song.difficulty === difficulty);
}

/**
 * Search example songs by title or description
 */
export function searchExamples(query: string): ExampleSong[] {
  const lowercaseQuery = query.toLowerCase();
  return getAllExampleSongs().filter(song => 
    song.title.toLowerCase().includes(lowercaseQuery) ||
    song.description.toLowerCase().includes(lowercaseQuery)
  );
}