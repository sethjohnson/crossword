<script lang="ts">
  import type { CrosswordPuzzle, PuzzleCell } from '@crossword/shared';

  export let puzzle: CrosswordPuzzle;

  // Calculate grid styles based on dimensions
  $: gridStyle = `
    --rows: ${puzzle.dimensions.height};
    --cols: ${puzzle.dimensions.width};
  `;

  // Helper to determine if a cell is a block
  function isBlock(cell: PuzzleCell): boolean {
    return cell === '#';
  }

  // Helper to get clue number (if any)
  function getNumber(cell: PuzzleCell): number | undefined {
    return typeof cell === 'number' && cell > 0 ? cell : undefined;
  }
</script>

<div class="crossword-grid" style={gridStyle}>
  {#each puzzle.puzzle as row, rowIndex}
    {#each row as cell, colIndex}
      <div 
        class="cell" 
        class:is-block={isBlock(cell)}
        data-row={rowIndex}
        data-col={colIndex}
      >
        {#if !isBlock(cell)}
          {#if getNumber(cell)}
            <span class="clue-number">{getNumber(cell)}</span>
          {/if}
          <!-- Value will go here in future milestones -->
          <div class="cell-content"></div>
        {/if}
      </div>
    {/each}
  {/each}
</div>

<style>
  .crossword-grid {
    display: grid;
    grid-template-columns: repeat(var(--cols), 1fr);
    grid-template-rows: repeat(var(--rows), 1fr);
    gap: 1px;
    background-color: #000; /* Gap color becomes border */
    border: 3px solid #000;
    width: 100%;
    aspect-ratio: var(--cols) / var(--rows);
    max-width: 600px; /* Constrain on large screens */
    margin: 0 auto;
  }

  .cell {
    background-color: #fff;
    position: relative;
    aspect-ratio: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    user-select: none;
  }

  .cell.is-block {
    background-color: #000;
  }

  .clue-number {
    position: absolute;
    top: 2px;
    left: 2px;
    font-size: 0.7rem;
    line-height: 1;
  }

  /* Responsive font scaling */
  @media (max-width: 600px) {
    .clue-number {
      font-size: 0.5rem;
      top: 1px;
      left: 1px;
    }
  }
</style>
