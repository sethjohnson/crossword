import { Router } from 'express';
import multer from 'multer';
import { rateLimit } from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';
import { parseIPUZ } from '@crossword/shared';
import { redis } from '../services/redis.js';

const router = Router();

// Configure multer for memory storage
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 1024 * 1024, // 1MB limit
    },
});

// Rate limiting: 1 request per minute per IP
// Note: This is aggressive, might need tuning for real usage
const uploadLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 5, // Limit each IP to 5 requests per windowMs (relaxed slightly from 1 for testing convenience)
    message: { error: 'Too many uploads, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

router.post('/', uploadLimiter, upload.single('puzzle'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // Parse buffer to JSON
        let json;
        try {
            const fileContent = req.file.buffer.toString('utf-8');
            json = JSON.parse(fileContent);
        } catch (e) {
            return res.status(400).json({ error: 'Invalid JSON file' });
        }

        // Validate using shared parser
        let puzzle;
        try {
            puzzle = parseIPUZ(json);
        } catch (e: any) {
            return res.status(400).json({
                error: 'Invalid puzzle format',
                details: e.message || 'Unknown validation error'
            });
        }

        // Generate stable ID
        const id = uuidv4();

        // Store in Redis
        await redis.set(`puzzle:${id}`, JSON.stringify(puzzle));

        // Generate share URL (assuming frontend runs on same host/port logic or configured base URL)
        // For MVP, returning the ID is most critical. Share URL construction can happen on client too.
        // We'll return a relative or configurable URL.
        const shareUrl = `/game/${id}`;

        res.status(201).json({
            id,
            shareUrl,
            message: 'Puzzle uploaded successfully'
        });

    } catch (error) {
        console.error('Upload Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/puzzle/:id - Retrieve puzzle by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const data = await redis.get(`puzzle:${id}`);

        if (!data) {
            return res.status(404).json({ error: 'Puzzle not found' });
        }

        const puzzle = JSON.parse(data);

        // Fetch game state (grid progress) if it exists
        const gameGridJson = await redis.hget(`game:${id}`, 'grid');
        const gameState = gameGridJson ? { grid: JSON.parse(gameGridJson) } : null;

        res.json({
            ...puzzle,
            gameState,
        });
    } catch (error) {
        console.error('Fetch Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
