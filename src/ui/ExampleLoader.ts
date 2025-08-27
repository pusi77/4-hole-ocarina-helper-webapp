/**
 * ExampleLoader - Manages example song loading and selection
 * Provides interface for loading pre-defined example songs
 */

import type { ExampleSong } from '../types/examples.js';
import { ExampleCategory } from '../types/examples.js';
import {
  // @ts-ignore - imported for completeness  
  EXAMPLE_SONGS,
  getAllExampleSongs,
  getExamplesByCategory,
  getExampleById
} from '../data/exampleSongs.js';

/**
 * Event handlers for ExampleLoader
 */
export interface ExampleLoaderEvents {
  onExampleSelected: (song: ExampleSong) => void;
  onExampleLoaded: (notation: string, title: string) => void;
  onError: (message: string) => void;
}

/**
 * Configuration for example loader UI
 */
export interface ExampleLoaderConfig {
  showCategories: boolean;
  showDifficulty: boolean;
  showDescriptions: boolean;
  defaultCategory?: ExampleCategory;
}

/**
 * ExampleLoader class handles example song selection and loading
 */
export class ExampleLoader {
  private events: ExampleLoaderEvents;
  private config: ExampleLoaderConfig;
  private container: HTMLElement | null = null;
  private currentCategory: ExampleCategory | null = null;

  constructor(events: ExampleLoaderEvents, config?: Partial<ExampleLoaderConfig>) {
    this.events = events;
    this.config = {
      showCategories: true,
      showDifficulty: true,
      showDescriptions: true,
      ...config
    };
  }

  /**
   * Initialize the ExampleLoader with a container element
   */
  initialize(container: HTMLElement): void {
    this.container = container;
    this.render();
  }

  /**
   * Render the example loader interface
   */
  private render(): void {
    if (!this.container) return;

    this.container.innerHTML = '';
    this.container.className = 'example-loader';

    // Create header
    const header = document.createElement('div');
    header.className = 'example-loader-header';
    header.innerHTML = '<h3>Example Songs</h3>';
    this.container.appendChild(header);

    // Create category selector if enabled
    if (this.config.showCategories) {
      this.renderCategorySelector();
    }

    // Create song list
    this.renderSongList();
  }

  /**
   * Render category selector dropdown
   */
  private renderCategorySelector(): void {
    if (!this.container) return;

    const selectorContainer = document.createElement('div');
    selectorContainer.className = 'category-selector';

    const label = document.createElement('label');
    label.textContent = 'Category: ';
    label.htmlFor = 'example-category-select';

    const select = document.createElement('select');
    select.id = 'example-category-select';
    select.className = 'category-select';

    // Add "All Categories" option
    const allOption = document.createElement('option');
    allOption.value = '';
    allOption.textContent = 'All Categories';
    select.appendChild(allOption);

    // Add category options
    Object.values(ExampleCategory).forEach(category => {
      const option = document.createElement('option');
      option.value = category;
      option.textContent = this.formatCategoryName(category);
      select.appendChild(option);
    });

    // Set default selection
    if (this.config.defaultCategory) {
      select.value = this.config.defaultCategory;
      this.currentCategory = this.config.defaultCategory;
    }

    select.addEventListener('change', (e) => {
      const target = e.target as HTMLSelectElement;
      this.currentCategory = target.value as ExampleCategory || null;
      this.renderSongList();
    });

    selectorContainer.appendChild(label);
    selectorContainer.appendChild(select);
    this.container.appendChild(selectorContainer);
  }

  /**
   * Render the list of songs
   */
  private renderSongList(): void {
    if (!this.container) return;

    // Remove existing song list
    const existingList = this.container.querySelector('.song-list');
    if (existingList) {
      existingList.remove();
    }

    const songList = document.createElement('div');
    songList.className = 'song-list';

    // Get songs to display
    const songs = this.currentCategory 
      ? getExamplesByCategory(this.currentCategory)
      : getAllExampleSongs();

    if (songs.length === 0) {
      const emptyMessage = document.createElement('div');
      emptyMessage.className = 'empty-message';
      emptyMessage.textContent = 'No examples available in this category.';
      songList.appendChild(emptyMessage);
    } else {
      songs.forEach(song => {
        const songItem = this.createSongItem(song);
        songList.appendChild(songItem);
      });
    }

    this.container.appendChild(songList);
  }

  /**
   * Create a song item element
   */
  private createSongItem(song: ExampleSong): HTMLElement {
    const item = document.createElement('div');
    item.className = `song-item difficulty-${song.difficulty}`;
    item.setAttribute('data-song-id', song.id);

    // Create song button
    const button = document.createElement('button');
    button.className = 'song-button';
    button.type = 'button';
    button.addEventListener('click', () => this.loadExample(song.id));

    // Song title
    const title = document.createElement('div');
    title.className = 'song-title';
    title.textContent = song.title;
    button.appendChild(title);

    // Difficulty badge if enabled
    if (this.config.showDifficulty) {
      const difficulty = document.createElement('span');
      difficulty.className = `difficulty-badge difficulty-${song.difficulty}`;
      difficulty.textContent = this.formatDifficulty(song.difficulty);
      button.appendChild(difficulty);
    }

    item.appendChild(button);

    // Description if enabled
    if (this.config.showDescriptions) {
      const description = document.createElement('div');
      description.className = 'song-description';
      description.textContent = song.description;
      item.appendChild(description);
    }

    return item;
  }

  /**
   * Load an example song by ID
   */
  public loadExample(songId: string): void {
    try {
      const song = getExampleById(songId);
      
      if (!song) {
        this.events.onError(`Example song with ID "${songId}" not found`);
        return;
      }

      // Notify that example was selected
      this.events.onExampleSelected(song);
      
      // Load the notation
      this.events.onExampleLoaded(song.notation, song.title);
      
      // Add visual feedback
      this.highlightSelectedSong(songId);
      
    } catch (error) {
      this.events.onError(
        `Failed to load example "${songId}": ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Highlight the selected song in the UI
   */
  private highlightSelectedSong(songId: string): void {
    if (!this.container) return;

    // Remove previous selection
    const previousSelected = this.container.querySelector('.song-item.selected');
    if (previousSelected) {
      previousSelected.classList.remove('selected');
    }

    // Add selection to current item
    const currentItem = this.container.querySelector(`[data-song-id="${songId}"]`);
    if (currentItem) {
      currentItem.classList.add('selected');
    }
  }

  /**
   * Format category name for display
   */
  private formatCategoryName(category: ExampleCategory): string {
    return category
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Format difficulty for display
   */
  private formatDifficulty(difficulty: ExampleSong['difficulty']): string {
    return difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
  }

  /**
   * Get all available example songs
   */
  public getAllExamples(): ExampleSong[] {
    return getAllExampleSongs();
  }

  /**
   * Get examples by category
   */
  public getExamplesByCategory(category: ExampleCategory): ExampleSong[] {
    return getExamplesByCategory(category);
  }

  /**
   * Set the current category filter
   */
  public setCategory(category: ExampleCategory | null): void {
    this.currentCategory = category;
    
    // Update UI if rendered
    if (this.container) {
      const select = this.container.querySelector('.category-select') as HTMLSelectElement;
      if (select) {
        select.value = category || '';
      }
      this.renderSongList();
    }
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<ExampleLoaderConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Re-render if container exists
    if (this.container) {
      this.render();
    }
  }

  /**
   * Clear selection
   */
  public clearSelection(): void {
    if (!this.container) return;

    const selected = this.container.querySelector('.song-item.selected');
    if (selected) {
      selected.classList.remove('selected');
    }
  }

  /**
   * Destroy the ExampleLoader and clean up
   */
  public destroy(): void {
    if (this.container) {
      this.container.innerHTML = '';
      this.container = null;
    }
  }
}