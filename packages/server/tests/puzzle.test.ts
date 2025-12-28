import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/index';

// Mock Redis
vi.mock('../src/services/redis', () => ({
    redis: {
        set: vi.fn().mockResolvedValue('OK'),
        on: vi.fn(),
    },
}));

// Valid minimal puzzle fixture
const validPuzzle = {
    version: "http://ipuz.org/v2",
    kind: ["http://ipuz.org/crossword#1"],
    dimensions: { width: 2, height: 2 },
    puzzle: [[1, 2], [3, 4]],
    solution: [["A", "B"], ["C", "D"]],
    clues: { Across: [[1, "A"], [3, "C"]], Down: [[1, "AC"], [2, "BD"]] }
};

describe('POST /api/puzzle', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should upload a valid puzzle and return 201 with ID', async () => {
        const response = await request(app)
            .post('/api/puzzle')
            .attach('puzzle', Buffer.from(JSON.stringify(validPuzzle)), 'test.ipuz');

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('id');
        expect(response.body).toHaveProperty('shareUrl');
        expect(response.body.shareUrl).toContain(response.body.id);
    });

    it('should return 400 if no file is uploaded', async () => {
        const response = await request(app)
            .post('/api/puzzle'); // No attachment

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('No file uploaded');
    });

    it('should return 400 for invalid JSON', async () => {
        const response = await request(app)
            .post('/api/puzzle')
            .attach('puzzle', Buffer.from('invalid json content'), 'bad.json');

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Invalid JSON file');
    });

    it('should return 400 for invalid puzzle schema', async () => {
        const invalidPuzzle = { ...validPuzzle, dimensions: "invalid" }; // Bad dimensions
        const response = await request(app)
            .post('/api/puzzle')
            .attach('puzzle', Buffer.from(JSON.stringify(invalidPuzzle)), 'invalid.ipuz');

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Invalid puzzle format');
    });
});
