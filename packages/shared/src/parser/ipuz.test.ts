import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parseIPUZ, safeParseIPUZ, formatParseError } from './ipuz';
import { ZodError } from 'zod';

// Helper to load fixture files
const loadFixture = (filename: string): string => {
    return readFileSync(join(__dirname, '../__fixtures__', filename), 'utf-8');
};

describe('parseIPUZ', () => {
    describe('valid puzzles', () => {
        it('parses the Monday sample puzzle', () => {
            const input = loadFixture('nyt241223mon.ipuz');
            const puzzle = parseIPUZ(input);

            expect(puzzle.version).toBe('http://ipuz.org/v2');
            expect(puzzle.kind).toContain('http://ipuz.org/crossword#1');
            expect(puzzle.dimensions).toEqual({ width: 15, height: 15 });
            expect(puzzle.title).toBe('New York Times, Monday, December 23, 2024');
            expect(puzzle.author).toBe('Glenn Cook');
            expect(puzzle.puzzle).toHaveLength(15);
            expect(puzzle.puzzle[0]).toHaveLength(15);
            expect(puzzle.solution).toHaveLength(15);
            expect(puzzle.clues.Across).toBeDefined();
            expect(puzzle.clues.Down).toBeDefined();
        });

        it('parses the Tuesday sample puzzle', () => {
            const input = loadFixture('nyt241224tue.ipuz');
            const puzzle = parseIPUZ(input);

            expect(puzzle.dimensions).toEqual({ width: 15, height: 15 });
            expect(puzzle.title).toBe('New York Times, Tuesday, December 24, 2024');
        });

        it('parses non-square grids (Wednesday puzzle is 15x14)', () => {
            const input = loadFixture('nyt241225wed.ipuz');
            const puzzle = parseIPUZ(input);

            expect(puzzle.dimensions).toEqual({ width: 15, height: 14 });
            expect(puzzle.puzzle).toHaveLength(14);
            expect(puzzle.puzzle[0]).toHaveLength(15);
        });

        it('accepts an already-parsed object', () => {
            const input = loadFixture('nyt241223mon.ipuz');
            const parsed = JSON.parse(input);
            const puzzle = parseIPUZ(parsed);

            expect(puzzle.title).toBe('New York Times, Monday, December 23, 2024');
        });
    });

    describe('malformed JSON', () => {
        it('throws SyntaxError for invalid JSON', () => {
            const input = '{ invalid json }';

            expect(() => parseIPUZ(input)).toThrow(SyntaxError);
        });

        it('provides helpful message for JSON errors', () => {
            const input = '{ "version": }';

            try {
                parseIPUZ(input);
                expect.fail('Should have thrown');
            } catch (error) {
                expect(error).toBeInstanceOf(SyntaxError);
                expect((error as SyntaxError).message).toContain('Invalid JSON');
            }
        });
    });

    describe('missing required fields', () => {
        it('throws for missing version', () => {
            const input = {
                kind: ['http://ipuz.org/crossword#1'],
                dimensions: { width: 3, height: 3 },
                puzzle: [[1, 2, 3], [0, 0, 0], [0, 0, 0]],
                solution: [['A', 'B', 'C'], ['D', 'E', 'F'], ['G', 'H', 'I']],
                clues: { Across: [[1, 'Test']], Down: [[1, 'Test']] },
            };

            expect(() => parseIPUZ(input)).toThrow(ZodError);
        });

        it('throws for missing kind', () => {
            const input = {
                version: 'http://ipuz.org/v2',
                dimensions: { width: 3, height: 3 },
                puzzle: [[1, 2, 3], [0, 0, 0], [0, 0, 0]],
                solution: [['A', 'B', 'C'], ['D', 'E', 'F'], ['G', 'H', 'I']],
                clues: { Across: [[1, 'Test']], Down: [[1, 'Test']] },
            };

            expect(() => parseIPUZ(input)).toThrow(ZodError);
        });

        it('throws for missing dimensions', () => {
            const input = {
                version: 'http://ipuz.org/v2',
                kind: ['http://ipuz.org/crossword#1'],
                puzzle: [[1, 2, 3], [0, 0, 0], [0, 0, 0]],
                solution: [['A', 'B', 'C'], ['D', 'E', 'F'], ['G', 'H', 'I']],
                clues: { Across: [[1, 'Test']], Down: [[1, 'Test']] },
            };

            expect(() => parseIPUZ(input)).toThrow(ZodError);
        });

        it('throws for missing puzzle grid', () => {
            const input = {
                version: 'http://ipuz.org/v2',
                kind: ['http://ipuz.org/crossword#1'],
                dimensions: { width: 3, height: 3 },
                solution: [['A', 'B', 'C'], ['D', 'E', 'F'], ['G', 'H', 'I']],
                clues: { Across: [[1, 'Test']], Down: [[1, 'Test']] },
            };

            expect(() => parseIPUZ(input)).toThrow(ZodError);
        });

        it('throws for missing solution grid', () => {
            const input = {
                version: 'http://ipuz.org/v2',
                kind: ['http://ipuz.org/crossword#1'],
                dimensions: { width: 3, height: 3 },
                puzzle: [[1, 2, 3], [0, 0, 0], [0, 0, 0]],
                clues: { Across: [[1, 'Test']], Down: [[1, 'Test']] },
            };

            expect(() => parseIPUZ(input)).toThrow(ZodError);
        });

        it('throws for missing clues', () => {
            const input = {
                version: 'http://ipuz.org/v2',
                kind: ['http://ipuz.org/crossword#1'],
                dimensions: { width: 3, height: 3 },
                puzzle: [[1, 2, 3], [0, 0, 0], [0, 0, 0]],
                solution: [['A', 'B', 'C'], ['D', 'E', 'F'], ['G', 'H', 'I']],
            };

            expect(() => parseIPUZ(input)).toThrow(ZodError);
        });
    });

    describe('invalid field values', () => {
        it('throws for invalid version', () => {
            const input = {
                version: 'http://ipuz.org/v1',
                kind: ['http://ipuz.org/crossword#1'],
                dimensions: { width: 3, height: 3 },
                puzzle: [[1, 2, 3], [0, 0, 0], [0, 0, 0]],
                solution: [['A', 'B', 'C'], ['D', 'E', 'F'], ['G', 'H', 'I']],
                clues: { Across: [[1, 'Test']], Down: [[1, 'Test']] },
            };

            expect(() => parseIPUZ(input)).toThrow(ZodError);
        });

        it('throws for non-crossword kind', () => {
            const input = {
                version: 'http://ipuz.org/v2',
                kind: ['http://ipuz.org/sudoku#1'],
                dimensions: { width: 3, height: 3 },
                puzzle: [[1, 2, 3], [0, 0, 0], [0, 0, 0]],
                solution: [['A', 'B', 'C'], ['D', 'E', 'F'], ['G', 'H', 'I']],
                clues: { Across: [[1, 'Test']], Down: [[1, 'Test']] },
            };

            expect(() => parseIPUZ(input)).toThrow(ZodError);
        });

        it('throws for dimensions out of range', () => {
            const input = {
                version: 'http://ipuz.org/v2',
                kind: ['http://ipuz.org/crossword#1'],
                dimensions: { width: 100, height: 3 },
                puzzle: [[1, 2, 3], [0, 0, 0], [0, 0, 0]],
                solution: [['A', 'B', 'C'], ['D', 'E', 'F'], ['G', 'H', 'I']],
                clues: { Across: [[1, 'Test']], Down: [[1, 'Test']] },
            };

            expect(() => parseIPUZ(input)).toThrow(ZodError);
        });
    });

    describe('dimension mismatch validation', () => {
        it('throws when puzzle grid height does not match dimensions', () => {
            const input = {
                version: 'http://ipuz.org/v2',
                kind: ['http://ipuz.org/crossword#1'],
                dimensions: { width: 3, height: 5 },
                puzzle: [[1, 2, 3], [0, 0, 0], [0, 0, 0]],
                solution: [['A', 'B', 'C'], ['D', 'E', 'F'], ['G', 'H', 'I']],
                clues: { Across: [[1, 'Test']], Down: [[1, 'Test']] },
            };

            try {
                parseIPUZ(input);
                expect.fail('Should have thrown');
            } catch (error) {
                expect(error).toBeInstanceOf(ZodError);
                expect((error as ZodError).message).toContain('does not match dimensions.height');
            }
        });

        it('throws when puzzle grid width does not match dimensions', () => {
            const input = {
                version: 'http://ipuz.org/v2',
                kind: ['http://ipuz.org/crossword#1'],
                dimensions: { width: 5, height: 3 },
                puzzle: [[1, 2, 3], [0, 0, 0], [0, 0, 0]],
                solution: [['A', 'B', 'C'], ['D', 'E', 'F'], ['G', 'H', 'I']],
                clues: { Across: [[1, 'Test']], Down: [[1, 'Test']] },
            };

            try {
                parseIPUZ(input);
                expect.fail('Should have thrown');
            } catch (error) {
                expect(error).toBeInstanceOf(ZodError);
                expect((error as ZodError).message).toContain('does not match dimensions.width');
            }
        });
    });
});

describe('safeParseIPUZ', () => {
    it('returns success for valid input', () => {
        const input = loadFixture('nyt241223mon.ipuz');
        const result = safeParseIPUZ(input);

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.title).toBe('New York Times, Monday, December 23, 2024');
        }
    });

    it('returns error for invalid input', () => {
        const input = '{ invalid }';
        const result = safeParseIPUZ(input);

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBeInstanceOf(SyntaxError);
        }
    });
});

describe('formatParseError', () => {
    it('formats ZodError into readable string', () => {
        const input = {
            version: 'bad',
            kind: [],
        };

        try {
            parseIPUZ(input);
        } catch (error) {
            if (error instanceof ZodError) {
                const formatted = formatParseError(error);
                expect(formatted).toContain('version');
            }
        }
    });
});
