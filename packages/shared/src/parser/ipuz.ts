import { CrosswordPuzzleSchema, type CrosswordPuzzle } from '../schemas/ipuz.js';
import { ZodError } from 'zod';

/**
 * Parse an iPUZ file and validate it against the schema.
 *
 * @param input - Either a JSON string or an already-parsed object
 * @returns The validated CrosswordPuzzle
 * @throws ZodError if validation fails (with detailed path information)
 * @throws SyntaxError if JSON parsing fails
 */
export function parseIPUZ(input: string | object): CrosswordPuzzle {
    let data: unknown;

    if (typeof input === 'string') {
        try {
            data = JSON.parse(input);
        } catch (error) {
            if (error instanceof SyntaxError) {
                throw new SyntaxError(`Invalid JSON: ${error.message}`);
            }
            throw error;
        }
    } else {
        data = input;
    }

    return CrosswordPuzzleSchema.parse(data);
}

/**
 * Safely parse an iPUZ file, returning a result object instead of throwing.
 *
 * @param input - Either a JSON string or an already-parsed object
 * @returns An object with either { success: true, data } or { success: false, error }
 */
export function safeParseIPUZ(
    input: string | object
): { success: true; data: CrosswordPuzzle } | { success: false; error: Error } {
    try {
        const data = parseIPUZ(input);
        return { success: true, data };
    } catch (error) {
        return { success: false, error: error as Error };
    }
}

/**
 * Format a ZodError into a human-readable string.
 */
export function formatParseError(error: ZodError): string {
    return error.issues
        .map((issue) => {
            const path = issue.path.length > 0 ? `${issue.path.join('.')}: ` : '';
            return `${path}${issue.message}`;
        })
        .join('\n');
}

// Re-export types
export type { CrosswordPuzzle } from '../schemas/ipuz.js';
