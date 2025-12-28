<script lang="ts">
  import type { CrosswordPuzzle, PuzzleCell } from '@crossword/shared';
  import { puzzleStore, currentWord, type CellPosition } from '../stores/puzzleStore';
  import { emitCellChange, cellOwners, playerId } from '../lib/socket';
  import { onMount } from 'svelte';

  export let puzzle: CrosswordPuzzle;

  // Initialize store with puzzle on mount
  onMount(() => {
    puzzleStore.loadPuzzle(puzzle);
  });

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

  // Check if cell is selected
  function isSelected(row: number, col: number): boolean {
    return $puzzleStore.selectedCell?.row === row && $puzzleStore.selectedCell?.col === col;
  }

  // Check if cell is in current word
  function isInCurrentWord(row: number, col: number): boolean {
    return $currentWord.some((c) => c.row === row && c.col === col);
  }

  // Check if cell is marked incorrect
  function isIncorrect(row: number, col: number): boolean {
    return $puzzleStore.incorrectCells.some((c) => c.row === row && c.col === col);
  }

  // Handle cell click
  function handleCellClick(row: number, col: number) {
    puzzleStore.selectCell(row, col);
  }

  // Handle keyboard input
  function handleKeyDown(event: KeyboardEvent) {
    if (!$puzzleStore.selectedCell) return;

    const key = event.key;
    const { row, col } = $puzzleStore.selectedCell;
    console.log('Key down:', key, 'Selected:', $puzzleStore.selectedCell);

    // Letter input
    if (/^[a-zA-Z]$/.test(key)) {
      event.preventDefault();
      puzzleStore.enterLetter(key);
      emitCellChange(row, col, key.toUpperCase());
      return;
    }

    // Navigation
    switch (key) {
      case 'ArrowUp':
        event.preventDefault();
        puzzleStore.move('up');
        break;
      case 'ArrowDown':
        event.preventDefault();
        puzzleStore.move('down');
        break;
      case 'ArrowLeft':
        event.preventDefault();
        puzzleStore.move('left');
        break;
      case 'ArrowRight':
        event.preventDefault();
        puzzleStore.move('right');
        break;
      case 'Tab':
        event.preventDefault();
        puzzleStore.toggleDirection();
        break;
      case 'Backspace':
        event.preventDefault();
        // Get current cell before clearing (might move)
        const currentValue = $puzzleStore.playerGrid[row]?.[col] || '';
        puzzleStore.clearCell();
        // Emit change for the cleared cell
        if (currentValue !== '') {
          emitCellChange(row, col, '');
        } else {
          // If was empty, clearCell moves back - emit for previous cell
          const prevCell = $puzzleStore.selectedCell;
          if (prevCell && (prevCell.row !== row || prevCell.col !== col)) {
            emitCellChange(prevCell.row, prevCell.col, '');
          }
        }
        break;
    }
  }

  // Get player color for a cell (for attribution)
  function getCellOwnerColor(row: number, col: number): string | null {
    const ownerId = $cellOwners.get(`${row},${col}`);
    if (!ownerId || ownerId === playerId) return null;
    // Generate deterministic color from player ID
    const hash = ownerId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const hue = hash % 360;
    return `hsl(${hue}, 70%, 80%)`;
  }

  // Reactive player grid from store
  $: playerGrid = $puzzleStore.playerGrid;

  // Reference to grid container for focus
  let gridElement: HTMLDivElement;
</script>

<div
  class="crossword-grid"
  style={gridStyle}
  tabindex="0"
  bind:this={gridElement}
  role="grid"
  aria-label="Crossword puzzle grid"
>
  {#each puzzle.puzzle as row, rowIndex}
    {#each row as cell, colIndex}
      <button
        class="cell"
        class:is-block={isBlock(cell)}
        class:is-selected={isSelected(rowIndex, colIndex)}
        class:is-highlighted={isInCurrentWord(rowIndex, colIndex) &&
          !isSelected(rowIndex, colIndex)}
        class:is-incorrect={isIncorrect(rowIndex, colIndex)}
        data-row={rowIndex}
        data-col={colIndex}
        on:click={() => handleCellClick(rowIndex, colIndex)}
        on:keydown={handleKeyDown}
        disabled={isBlock(cell)}
        type="button"
        role="gridcell"
        aria-label={isBlock(cell) ? 'Block' : `Row ${rowIndex + 1}, Column ${colIndex + 1}`}
        style={getCellOwnerColor(rowIndex, colIndex)
          ? `background-color: ${getCellOwnerColor(rowIndex, colIndex)}`
          : ''}
      >
        {#if !isBlock(cell)}
          {#if getNumber(cell)}
            <span class="clue-number">{getNumber(cell)}</span>
          {/if}
          <span class="cell-value">{playerGrid[rowIndex]?.[colIndex] ?? ''}</span>
        {/if}
      </button>
    {/each}
  {/each}
</div>

<style>
  .crossword-grid {
    display: grid;
    grid-template-columns: repeat(var(--cols), 1fr);
    grid-template-rows: repeat(var(--rows), 1fr);
    gap: 1px;
    background-color: #000;
    border: 3px solid #000;
    width: 100%;
    aspect-ratio: var(--cols) / var(--rows);
    max-width: 600px;
    margin: 0 auto;
    outline: none;
  }

  .crossword-grid:focus-within {
    box-shadow: 0 0 0 3px rgba(50, 115, 220, 0.4);
  }

  .cell {
    background-color: #fff;
    position: relative;
    aspect-ratio: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    font-size: 1.2rem;
    user-select: none;
    cursor: pointer;
    border: none;
    padding: 0;
    outline: none;
    transition: background-color 0.1s ease;
  }

  .cell:focus {
    outline: none;
  }

  .cell.is-block {
    background-color: #000;
    cursor: default;
  }

  .cell.is-selected {
    background-color: #ffda00;
  }

  .cell.is-highlighted {
    background-color: #a7d8ff;
  }

  .clue-number {
    position: absolute;
    top: 2px;
    left: 3px;
    font-size: 0.65rem;
    font-weight: normal;
    line-height: 1;
    color: #333;
  }

  .cell-value {
    font-size: 1.1rem;
    font-weight: bold;
    text-transform: uppercase;
  }

  /* Responsive font scaling */
  @media (max-width: 600px) {
    .clue-number {
      font-size: 0.5rem;
      top: 1px;
      left: 1px;
    }

    .cell-value {
      font-size: 0.9rem;
    }
  }

  /* Incorrect cell - red shake animation */
  .cell.is-incorrect {
    animation: shake 0.3s ease-in-out;
    background-color: #ffdddd;
  }

  @keyframes shake {
    0%,
    100% {
      transform: translateX(0);
    }
    25% {
      transform: translateX(-3px);
    }
    75% {
      transform: translateX(3px);
    }
  }
</style>
