<script lang="ts">
  import type { Clues } from '@crossword/shared';
  import { puzzleStore, currentClueNumber } from '../stores/puzzleStore';
  import { tick } from 'svelte';

  export let clues: Clues;

  // Reactive reference to active elements for scrolling
  let acrossRefs: Record<number, HTMLElement> = {};
  let downRefs: Record<number, HTMLElement> = {};

  // Scroll active clue into view when it changes
  $: if ($currentClueNumber !== null) {
    tick().then(() => {
      const el =
        $puzzleStore.direction === 'across'
          ? acrossRefs[$currentClueNumber]
          : downRefs[$currentClueNumber];
      el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }

  // Check if a clue is active
  function isActive(number: number, direction: 'across' | 'down'): boolean {
    return $currentClueNumber === number && $puzzleStore.direction === direction;
  }

  // Handle clue click - select corresponding cell
  function handleClueClick(number: number, direction: 'across' | 'down', event: Event) {
    event.preventDefault();

    if (!$puzzleStore.puzzle) return;

    // Find the cell with this clue number
    for (let row = 0; row < $puzzleStore.puzzle.dimensions.height; row++) {
      for (let col = 0; col < $puzzleStore.puzzle.dimensions.width; col++) {
        const cell = $puzzleStore.puzzle.puzzle[row][col];
        if (typeof cell === 'number' && cell === number) {
          puzzleStore.setDirection(direction);
          puzzleStore.selectCell(row, col);
          return;
        }
      }
    }
  }
</script>

<div class="columns is-variable is-4">
  <div class="column is-half">
    <h3 class="title is-5 mb-3">Across</h3>
    <div class="clue-column">
      {#each clues.Across as [number, text]}
        <button
          class="clue mb-1"
          class:is-active={isActive(number, 'across')}
          bind:this={acrossRefs[number]}
          on:click={(e) => handleClueClick(number, 'across', e)}
          type="button"
        >
          <strong>{number}</strong>
          {text}
        </button>
      {/each}
    </div>
  </div>

  <div class="column is-half">
    <h3 class="title is-5 mb-3">Down</h3>
    <div class="clue-column">
      {#each clues.Down as [number, text]}
        <button
          class="clue mb-1"
          class:is-active={isActive(number, 'down')}
          bind:this={downRefs[number]}
          on:click={(e) => handleClueClick(number, 'down', e)}
          type="button"
        >
          <strong>{number}</strong>
          {text}
        </button>
      {/each}
    </div>
  </div>
</div>

<style>
  .clue-column {
    max-height: 500px;
    overflow-y: auto;
    padding-right: 0.5rem;
  }

  .clue {
    display: block;
    width: 100%;
    text-align: left;
    font-size: 0.9rem;
    line-height: 1.4;
    padding: 0.4rem 0.6rem;
    background: transparent;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.15s ease;
  }

  .clue:hover {
    background-color: #f5f5f5;
  }

  .clue.is-active {
    background-color: #a7d8ff;
    font-weight: 500;
  }

  .clue strong {
    margin-right: 0.4rem;
  }

  /* Style scrollbars */
  .clue-column::-webkit-scrollbar {
    width: 6px;
  }
  .clue-column::-webkit-scrollbar-thumb {
    background-color: #dbdbdb;
    border-radius: 3px;
  }
</style>
