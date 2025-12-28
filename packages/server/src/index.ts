import express from 'express';
import cors from 'cors';
import { VERSION } from '@crossword/shared';

const app = express();
const PORT = process.env.PORT || 3000;

import puzzleRouter from './routes/puzzle.js';

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/puzzle', puzzleRouter);

// Health check endpoint
app.get('/health', (_req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: VERSION,
    });
});

// Start server if not in test mode
if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
        console.log(`📋 Health check: http://localhost:${PORT}/health`);
    });
}

export { app };
