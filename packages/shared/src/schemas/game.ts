import { z } from 'zod';

/**
 * Internal Game State Schemas
 *
 * These represent the runtime game state, separate from the iPUZ format.
 */

/**
 * Cell types in the processed grid
 */
export const CellTypeSchema = z.enum(['letter', 'block']);

/**
 * A processed cell in the puzzle grid
 */
export const CellSchema = z.object({
    type: CellTypeSchema,
    number: z.number().int().positive().optional(),
    solution: z.string().optional(),
    row: z.number().int().min(0),
    col: z.number().int().min(0),
});

/**
 * A cell with player-entered content
 */
export const PlayerCellSchema = z.object({
    value: z.string().default(''),
    playerId: z.string().optional(),
});

/**
 * The current game state
 */
export const GameStateSchema = z.object({
    grid: z.array(z.array(PlayerCellSchema)),
    completed: z.boolean().default(false),
    startedAt: z.number().optional(),
});

// Inferred TypeScript types
export type CellType = z.infer<typeof CellTypeSchema>;
export type Cell = z.infer<typeof CellSchema>;
export type PlayerCell = z.infer<typeof PlayerCellSchema>;
export type GameState = z.infer<typeof GameStateSchema>;
