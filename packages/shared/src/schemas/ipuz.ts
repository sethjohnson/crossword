import { z } from 'zod';

/**
 * iPUZ Crossword Schema Definitions
 *
 * Based on the iPUZ v2 specification: https://www.puzzazz.com/ipuz
 * This implements the core subset needed for American crosswords.
 */

// Version must be exactly this string
export const IpuzVersionSchema = z.literal('http://ipuz.org/v2');

// Kind array must include the crossword type
export const IpuzKindSchema = z.array(z.string()).refine(
    (kinds) => kinds.some((k) => k.startsWith('http://ipuz.org/crossword')),
    { message: 'kind must include a crossword type (http://ipuz.org/crossword)' }
);

// Dimensions: width and height (supports non-square grids)
export const DimensionsSchema = z.object({
    width: z.number().int().min(1).max(30),
    height: z.number().int().min(1).max(30),
});

/**
 * Puzzle cell can be:
 * - A positive integer (clue number)
 * - 0 (empty white cell)
 * - "#" (black/block cell)
 * - An object with cell property (for styled cells - we extract the cell value)
 */
export const PuzzleCellSchema = z.union([
    z.number().int().min(0),
    z.literal('#'),
    z
        .object({
            cell: z.union([z.number().int().min(0), z.literal('#')]),
            style: z.record(z.unknown()).optional(),
            value: z.string().optional(),
        })
        .transform((obj) => obj.cell),
]);

export const PuzzleGridSchema = z.array(z.array(PuzzleCellSchema));

/**
 * Solution cell can be:
 * - A string (letter or letters for rebus)
 * - "#" (black/block cell)
 * - null (no solution provided for this cell)
 */
export const SolutionCellSchema = z.union([z.string(), z.literal('#'), z.null()]);

export const SolutionGridSchema = z.array(z.array(SolutionCellSchema));

/**
 * Clue format: [number, text]
 * e.g., [1, "First clue"]
 */
export const ClueSchema = z.tuple([z.number().int().positive(), z.string()]);

export const CluesSchema = z.object({
    Across: z.array(ClueSchema),
    Down: z.array(ClueSchema),
});

/**
 * Complete CrosswordPuzzle schema
 */
export const CrosswordPuzzleSchema = z
    .object({
        version: IpuzVersionSchema,
        kind: IpuzKindSchema,
        dimensions: DimensionsSchema,
        puzzle: PuzzleGridSchema,
        solution: SolutionGridSchema,
        clues: CluesSchema,
        // Optional metadata
        title: z.string().optional(),
        author: z.string().optional(),
        copyright: z.string().optional(),
        notes: z.string().optional(),
    })
    .refine(
        (data) => data.puzzle.length === data.dimensions.height,
        (data) => ({
            message: `Puzzle grid height (${data.puzzle.length}) does not match dimensions.height (${data.dimensions.height})`,
        })
    )
    .refine(
        (data) => data.puzzle.every((row) => row.length === data.dimensions.width),
        (data) => ({
            message: `Puzzle grid width does not match dimensions.width (${data.dimensions.width})`,
        })
    )
    .refine(
        (data) => data.solution.length === data.dimensions.height,
        (data) => ({
            message: `Solution grid height (${data.solution.length}) does not match dimensions.height (${data.dimensions.height})`,
        })
    )
    .refine(
        (data) => data.solution.every((row) => row.length === data.dimensions.width),
        (data) => ({
            message: `Solution grid width does not match dimensions.width (${data.dimensions.width})`,
        })
    );

// Inferred TypeScript types
export type IpuzVersion = z.infer<typeof IpuzVersionSchema>;
export type IpuzKind = z.infer<typeof IpuzKindSchema>;
export type Dimensions = z.infer<typeof DimensionsSchema>;
export type PuzzleCell = z.infer<typeof PuzzleCellSchema>;
export type SolutionCell = z.infer<typeof SolutionCellSchema>;
export type Clue = z.infer<typeof ClueSchema>;
export type Clues = z.infer<typeof CluesSchema>;
export type CrosswordPuzzle = z.infer<typeof CrosswordPuzzleSchema>;
