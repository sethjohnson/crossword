/**
 * Parser for Across Lite .puz files
 * Format specification: https://code.google.com/archive/p/puz/wikis/FileFormat.wiki
 */

import type { CrosswordPuzzle, Clue } from '../schemas/ipuz.js';

// Header offsets (in bytes)
const HEADER = {
    CHECKSUM: 0x00,        // 2 bytes
    MAGIC: 0x02,           // 12 bytes "ACROSS&DOWN\0"
    CIB_CHECKSUM: 0x0E,    // 2 bytes
    MASKED_LOW: 0x10,      // 4 bytes
    MASKED_HIGH: 0x14,     // 4 bytes
    VERSION: 0x18,         // 4 bytes (null-terminated)
    RESERVED_1C: 0x1C,     // 2 bytes
    SCRAMBLED_CHECKSUM: 0x1E,  // 2 bytes
    RESERVED_20: 0x20,     // 12 bytes
    WIDTH: 0x2C,           // 1 byte
    HEIGHT: 0x2D,          // 1 byte
    CLUE_COUNT: 0x2E,      // 2 bytes (little-endian)
    PUZZLE_TYPE: 0x30,     // 2 bytes
    SOLUTION_STATE: 0x32,  // 2 bytes
    HEADER_END: 0x34       // Solution starts here
};

const MAGIC_STRING = 'ACROSS&DOWN\0';
const BLACK_CELL = '.';
const EMPTY_CELL = '-';

export interface PuzParseResult {
    puzzle: CrosswordPuzzle;
    playerState?: string[][];
}

/**
 * Parse a .puz file buffer into a CrosswordPuzzle
 */
export function parsePuz(buffer: Buffer): CrosswordPuzzle {
    // Validate magic string
    const magic = buffer.toString('ascii', HEADER.MAGIC, HEADER.MAGIC + 12);
    if (magic !== MAGIC_STRING) {
        throw new Error('Invalid .puz file: magic string not found');
    }

    // Read dimensions
    const width = buffer.readUInt8(HEADER.WIDTH);
    const height = buffer.readUInt8(HEADER.HEIGHT);
    const clueCount = buffer.readUInt16LE(HEADER.CLUE_COUNT);

    if (width === 0 || height === 0) {
        throw new Error('Invalid .puz file: dimensions are zero');
    }

    const gridSize = width * height;

    // Read solution grid (starts at 0x34)
    const solutionStart = HEADER.HEADER_END;
    const solutionEnd = solutionStart + gridSize;
    const solutionString = buffer.toString('ascii', solutionStart, solutionEnd);

    // Read player state (immediately after solution)
    const stateStart = solutionEnd;
    const stateEnd = stateStart + gridSize;
    // const stateString = buffer.toString('ascii', stateStart, stateEnd);

    // Parse strings section (starts after player state)
    const stringsStart = stateEnd;
    const strings = parseNullSeparatedStrings(buffer, stringsStart, clueCount + 3);

    const title = strings[0] || 'Untitled';
    const author = strings[1] || '';
    const copyright = strings[2] || '';
    const clueStrings = strings.slice(3, 3 + clueCount);

    // Convert solution string to 2D grid
    const solution: string[][] = [];
    for (let row = 0; row < height; row++) {
        const rowData: string[] = [];
        for (let col = 0; col < width; col++) {
            const char = solutionString[row * width + col];
            rowData.push(char === BLACK_CELL ? '#' : char);
        }
        solution.push(rowData);
    }

    // Build puzzle grid with clue numbers
    const { puzzle, acrossClues, downClues } = buildPuzzleGrid(
        width,
        height,
        solution,
        clueStrings
    );

    return {
        version: 'http://ipuz.org/v2',
        kind: ['http://ipuz.org/crossword#1'],
        dimensions: { width, height },
        title,
        author,
        copyright,
        puzzle,
        solution,
        clues: {
            Across: acrossClues,
            Down: downClues
        }
    };
}

/**
 * Parse null-separated strings from buffer
 */
function parseNullSeparatedStrings(buffer: Buffer, start: number, count: number): string[] {
    const strings: string[] = [];
    let pos = start;

    for (let i = 0; i < count && pos < buffer.length; i++) {
        const end = buffer.indexOf(0, pos);
        if (end === -1) {
            // Remaining data is last string
            strings.push(buffer.toString('latin1', pos));
            break;
        }
        strings.push(buffer.toString('latin1', pos, end));
        pos = end + 1;
    }

    return strings;
}

/**
 * Build puzzle grid with clue numbers derived from grid shape
 */
function buildPuzzleGrid(
    width: number,
    height: number,
    solution: string[][],
    clueStrings: string[]
): {
    puzzle: (number | '#')[][];
    acrossClues: Clue[];
    downClues: Clue[]
} {
    const puzzle: (number | '#')[][] = [];
    const acrossClues: Clue[] = [];
    const downClues: Clue[] = [];

    let cellNumber = 1;
    let clueIndex = 0;

    const isBlack = (row: number, col: number): boolean => {
        if (row < 0 || row >= height || col < 0 || col >= width) return true;
        return solution[row][col] === '#';
    };

    const needsAcrossNumber = (row: number, col: number): boolean => {
        // Left edge or black cell to the left, and room for at least 2 cells
        return (col === 0 || isBlack(row, col - 1)) &&
            col + 1 < width && !isBlack(row, col + 1);
    };

    const needsDownNumber = (row: number, col: number): boolean => {
        // Top edge or black cell above, and room for at least 2 cells
        return (row === 0 || isBlack(row - 1, col)) &&
            row + 1 < height && !isBlack(row + 1, col);
    };

    for (let row = 0; row < height; row++) {
        const puzzleRow: (number | '#')[] = [];
        for (let col = 0; col < width; col++) {
            if (isBlack(row, col)) {
                puzzleRow.push('#');
                continue;
            }

            const needsAcross = needsAcrossNumber(row, col);
            const needsDown = needsDownNumber(row, col);

            if (needsAcross || needsDown) {
                puzzleRow.push(cellNumber);

                if (needsAcross && clueIndex < clueStrings.length) {
                    acrossClues.push([cellNumber, clueStrings[clueIndex++]]);
                }
                if (needsDown && clueIndex < clueStrings.length) {
                    downClues.push([cellNumber, clueStrings[clueIndex++]]);
                }

                cellNumber++;
            } else {
                puzzleRow.push(0);
            }
        }
        puzzle.push(puzzleRow);
    }

    return { puzzle, acrossClues, downClues };
}

/**
 * Check if a buffer is a valid .puz file
 */
export function isPuzFile(buffer: Buffer): boolean {
    if (buffer.length < HEADER.HEADER_END) return false;
    const magic = buffer.toString('ascii', HEADER.MAGIC, HEADER.MAGIC + 12);
    return magic === MAGIC_STRING;
}
