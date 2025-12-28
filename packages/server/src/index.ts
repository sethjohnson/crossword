import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { VERSION } from '@crossword/shared';
import { initializeSocket } from './socket.js';

import puzzleRouter from './routes/puzzle.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Create HTTP server for Socket.io
const httpServer = createServer(app);

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

// Initialize Socket.io
const io = initializeSocket(httpServer);

// Start server if not in test mode
if (process.env.NODE_ENV !== 'test') {
    httpServer.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
        console.log(`📋 Health check: http://localhost:${PORT}/health`);
        console.log(`🔌 WebSocket ready`);
    });
}

export { app, httpServer, io };
