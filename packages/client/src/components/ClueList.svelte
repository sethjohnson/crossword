<script lang="ts">
  import type { Clues } from '@crossword/shared';

  export let clues: Clues;
</script>

<div class="columns is-variable is-4">
  <div class="column is-half">
    <h3 class="title is-4 mb-3">Across</h3>
    <div class="clue-column">
      {#each clues.Across as [number, text]}
        <div class="clue mb-1">
          <strong>{number}</strong>
          {text}
        </div>
      {/each}
    </div>
  </div>

  <div class="column is-half">
    <h3 class="title is-4 mb-3">Down</h3>
    <div class="clue-column">
      {#each clues.Down as [number, text]}
        <div class="clue mb-1">
          <strong>{number}</strong>
          {text}
        </div>
      {/each}
    </div>
  </div>
</div>

<style>
  .clue-column {
    max-height: 600px;
    overflow-y: auto;
    padding-right: 0.5rem;
  }

  .clue {
    font-size: 0.95rem;
    line-height: 1.4;
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
