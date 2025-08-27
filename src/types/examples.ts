/**
 * Example songs and related types
 */

/**
 * Example song data structure
 */
export interface ExampleSong {
  id: string;
  title: string;
  description: string;
  notation: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

/**
 * Example song categories
 */
export enum ExampleCategory {
  SCALES = 'scales',
  SIMPLE_SONGS = 'simple_songs',
  POPULAR_SONGS = 'popular_songs',
  TESTS = 'tests'
}