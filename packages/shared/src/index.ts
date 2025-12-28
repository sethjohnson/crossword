/**
 * @crossword/shared
 *
 * Shared types and Zod schemas for the crossword app.
 * Used by both server and client packages.
 */

export const VERSION = '0.0.1';

// Re-export Zod for convenience
export { z } from 'zod';

// iPUZ schemas and types
export {
    IpuzVersionSchema,
    IpuzKindSchema,
    DimensionsSchema,
    PuzzleCellSchema,
    PuzzleGridSchema,
    SolutionCellSchema,
    SolutionGridSchema,
    ClueSchema,
    CluesSchema,
    CrosswordPuzzleSchema,
    type IpuzVersion,
    type IpuzKind,
    type Dimensions,
    type PuzzleCell,
    type SolutionCell,
    type Clue,
    type Clues,
    type CrosswordPuzzle,
} from './schemas/ipuz.js';

// Game state schemas and types
export {
    CellTypeSchema,
    CellSchema,
    PlayerCellSchema,
    GameStateSchema,
    type CellType,
    type Cell,
    type PlayerCell,
    type GameState,
} from './schemas/game.js';

// Parser functions
export { parseIPUZ, safeParseIPUZ, formatParseError } from './parser/ipuz.js';
