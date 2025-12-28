import { writable, derived, get } from 'svelte/store';
import type { CrosswordPuzzle, PuzzleCell } from '@crossword/shared';

export type Direction = 'across' | 'down';

export interface CellPosition {
    row: number;
    col: number;
}

export interface PuzzleState {
    puzzle: CrosswordPuzzle | null;
    selectedCell: CellPosition | null;
    direction: Direction;
    playerGrid: string[][];
    incorrectCells: CellPosition[];
}

function createPuzzleStore() {
    const { subscribe, set, update } = writable<PuzzleState>({
        puzzle: null,
        selectedCell: null,
        direction: 'across',
        playerGrid: [],
        incorrectCells: [],
    });

    return {
        subscribe,

        // Initialize with a puzzle
        loadPuzzle(puzzle: CrosswordPuzzle) {
            const playerGrid = puzzle.puzzle.map((row) =>
                row.map((cell) => (isBlock(cell) ? '#' : ''))
            );
            set({
                puzzle,
                selectedCell: null,
                direction: 'across',
                playerGrid,
                incorrectCells: [],
            });
        },

        // Select a cell
        selectCell(row: number, col: number) {
            update((state) => {
                if (!state.puzzle) return state;

                const cell = state.puzzle.puzzle[row]?.[col];
                if (isBlock(cell)) return state;

                // If clicking the same cell, toggle direction
                if (
                    state.selectedCell?.row === row &&
                    state.selectedCell?.col === col
                ) {
                    return {
                        ...state,
                        direction: state.direction === 'across' ? 'down' : 'across',
                    };
                }

                return {
                    ...state,
                    selectedCell: { row, col },
                };
            });
        },

        // Toggle direction
        toggleDirection() {
            update((state) => ({
                ...state,
                direction: state.direction === 'across' ? 'down' : 'across',
            }));
        },

        // Set direction explicitly
        setDirection(direction: Direction) {
            update((state) => ({ ...state, direction }));
        },

        // Enter a letter in the current cell
        enterLetter(letter: string) {
            update((state) => {
                if (!state.selectedCell || !state.puzzle) return state;

                const { row, col } = state.selectedCell;
                const newGrid = state.playerGrid.map((r) => [...r]);
                newGrid[row][col] = letter.toUpperCase();

                // Advance to next cell
                const next = getNextCell(state.puzzle, row, col, state.direction);

                return {
                    ...state,
                    playerGrid: newGrid,
                    selectedCell: next || state.selectedCell,
                    // Clear incorrect state when user types
                    incorrectCells: state.incorrectCells.filter(
                        (c) => !(c.row === row && c.col === col)
                    ),
                };
            });
        },

        // Clear current cell (backspace)
        clearCell() {
            update((state) => {
                if (!state.selectedCell || !state.puzzle) return state;

                const { row, col } = state.selectedCell;
                const currentValue = state.playerGrid[row][col];

                // If cell is empty, move back first
                if (currentValue === '') {
                    const prev = getPrevCell(state.puzzle, row, col, state.direction);
                    if (prev) {
                        const newGrid = state.playerGrid.map((r) => [...r]);
                        newGrid[prev.row][prev.col] = '';
                        return {
                            ...state,
                            playerGrid: newGrid,
                            selectedCell: prev,
                        };
                    }
                    return state;
                }

                // Clear current cell
                const newGrid = state.playerGrid.map((r) => [...r]);
                newGrid[row][col] = '';

                return {
                    ...state,
                    playerGrid: newGrid,
                };
            });
        },

        // Move in a direction
        move(direction: 'up' | 'down' | 'left' | 'right') {
            update((state) => {
                if (!state.selectedCell || !state.puzzle) return state;

                const { row, col } = state.selectedCell;
                let newRow = row;
                let newCol = col;

                switch (direction) {
                    case 'up':
                        newRow = Math.max(0, row - 1);
                        break;
                    case 'down':
                        newRow = Math.min(state.puzzle.dimensions.height - 1, row + 1);
                        break;
                    case 'left':
                        newCol = Math.max(0, col - 1);
                        break;
                    case 'right':
                        newCol = Math.min(state.puzzle.dimensions.width - 1, col + 1);
                        break;
                }

                // Skip blocks
                const cell = state.puzzle.puzzle[newRow]?.[newCol];
                if (isBlock(cell)) return state;

                return {
                    ...state,
                    selectedCell: { row: newRow, col: newCol },
                };
            });
        },

        // Get current value at position
        getValue(row: number, col: number): string {
            const state = get({ subscribe });
            return state.playerGrid[row]?.[col] ?? '';
        },

        // Check puzzle - mark incorrect cells
        checkPuzzle() {
            update((state) => {
                if (!state.puzzle) return state;

                const incorrectCells: CellPosition[] = [];
                const solution = state.puzzle.solution;

                for (let row = 0; row < state.playerGrid.length; row++) {
                    for (let col = 0; col < state.playerGrid[row].length; col++) {
                        const playerValue = state.playerGrid[row][col];
                        const solutionValue = solution[row][col];

                        // Skip blocks and empty cells
                        if (playerValue === '#' || playerValue === '') continue;

                        // Check if incorrect
                        if (playerValue !== solutionValue) {
                            incorrectCells.push({ row, col });
                        }
                    }
                }

                return {
                    ...state,
                    incorrectCells,
                };
            });
        },

        // Reveal puzzle - copy solution to playerGrid
        revealPuzzle() {
            update((state) => {
                if (!state.puzzle) return state;

                const newGrid = state.puzzle.solution.map((row) =>
                    row.map((cell): string => (cell === '#' ? '#' : (cell ?? '')))
                );

                return {
                    ...state,
                    playerGrid: newGrid,
                    incorrectCells: [],
                };
            });
        },

        // Clear incorrect markers
        clearIncorrect() {
            update((state) => ({
                ...state,
                incorrectCells: [],
            }));
        },

        // Apply a remote cell change (from another player)
        applyRemoteChange(row: number, col: number, value: string) {
            update((state) => {
                if (!state.puzzle) return state;

                const newGrid = state.playerGrid.map((r) => [...r]);
                newGrid[row][col] = value;

                return {
                    ...state,
                    playerGrid: newGrid,
                };
            });
        },
    };
}

// Helper functions
function isBlock(cell: PuzzleCell): boolean {
    return cell === '#';
}

function getNextCell(
    puzzle: CrosswordPuzzle,
    row: number,
    col: number,
    direction: Direction
): CellPosition | null {
    const { width, height } = puzzle.dimensions;

    if (direction === 'across') {
        for (let c = col + 1; c < width; c++) {
            if (!isBlock(puzzle.puzzle[row][c])) {
                return { row, col: c };
            }
        }
    } else {
        for (let r = row + 1; r < height; r++) {
            if (!isBlock(puzzle.puzzle[r][col])) {
                return { row: r, col };
            }
        }
    }

    return null;
}

function getPrevCell(
    puzzle: CrosswordPuzzle,
    row: number,
    col: number,
    direction: Direction
): CellPosition | null {
    if (direction === 'across') {
        for (let c = col - 1; c >= 0; c--) {
            if (!isBlock(puzzle.puzzle[row][c])) {
                return { row, col: c };
            }
        }
    } else {
        for (let r = row - 1; r >= 0; r--) {
            if (!isBlock(puzzle.puzzle[r][col])) {
                return { row: r, col };
            }
        }
    }

    return null;
}

// Export store instance
export const puzzleStore = createPuzzleStore();

// Derived stores
export const currentWord = derived(puzzleStore, ($state) => {
    if (!$state.puzzle || !$state.selectedCell) return [];

    const { row, col } = $state.selectedCell;
    const { direction, puzzle } = $state;
    const cells: CellPosition[] = [];

    if (direction === 'across') {
        // Find word start
        let startCol = col;
        while (startCol > 0 && !isBlock(puzzle.puzzle[row][startCol - 1])) {
            startCol--;
        }
        // Find word end
        let endCol = col;
        while (
            endCol < puzzle.dimensions.width - 1 &&
            !isBlock(puzzle.puzzle[row][endCol + 1])
        ) {
            endCol++;
        }
        // Collect all cells
        for (let c = startCol; c <= endCol; c++) {
            cells.push({ row, col: c });
        }
    } else {
        // Find word start
        let startRow = row;
        while (startRow > 0 && !isBlock(puzzle.puzzle[startRow - 1][col])) {
            startRow--;
        }
        // Find word end
        let endRow = row;
        while (
            endRow < puzzle.dimensions.height - 1 &&
            !isBlock(puzzle.puzzle[endRow + 1][col])
        ) {
            endRow++;
        }
        // Collect all cells
        for (let r = startRow; r <= endRow; r++) {
            cells.push({ row: r, col });
        }
    }

    return cells;
});

export const currentClueNumber = derived(puzzleStore, ($state) => {
    if (!$state.puzzle || !$state.selectedCell) return null;

    const { row, col } = $state.selectedCell;
    const { direction, puzzle } = $state;

    if (direction === 'across') {
        // Find word start
        let startCol = col;
        while (startCol > 0 && !isBlock(puzzle.puzzle[row][startCol - 1])) {
            startCol--;
        }
        const cell = puzzle.puzzle[row][startCol];
        return typeof cell === 'number' && cell > 0 ? cell : null;
    } else {
        // Find word start
        let startRow = row;
        while (startRow > 0 && !isBlock(puzzle.puzzle[startRow - 1][col])) {
            startRow--;
        }
        const cell = puzzle.puzzle[startRow][col];
        return typeof cell === 'number' && cell > 0 ? cell : null;
    }
});

// Derived store for puzzle completion
export const isComplete = derived(puzzleStore, ($state) => {
    if (!$state.puzzle) return false;

    const solution = $state.puzzle.solution;
    const playerGrid = $state.playerGrid;

    for (let row = 0; row < solution.length; row++) {
        for (let col = 0; col < solution[row].length; col++) {
            const solutionValue = solution[row][col];
            const playerValue = playerGrid[row]?.[col];

            // Skip blocks
            if (solutionValue === '#') continue;

            // Check if cell is correct (non-empty and matches)
            if (!playerValue || playerValue !== solutionValue) {
                return false;
            }
        }
    }

    return true;
});
