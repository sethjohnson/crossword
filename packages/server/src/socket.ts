import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';

// Track socket connections per room (by socket.id for accurate multi-tab count)
const roomSockets = new Map<string, Set<string>>();

export function initializeSocket(httpServer: HttpServer): Server {
    const io = new Server(httpServer, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST'],
        },
    });

    io.on('connection', (socket: Socket) => {
        console.log(`[Socket] Client connected: ${socket.id}`);

        socket.on('room:join', ({ puzzleId, playerId }: { puzzleId: string; playerId: string }) => {
            const roomName = `puzzle:${puzzleId}`;

            // Join the Socket.io room
            socket.join(roomName);

            // Track socket in room (use socket.id for accurate count)
            if (!roomSockets.has(roomName)) {
                roomSockets.set(roomName, new Set());
            }
            roomSockets.get(roomName)!.add(socket.id);

            // Store room info on socket for cleanup
            socket.data.roomName = roomName;
            socket.data.playerId = playerId;

            console.log(`[Socket] Player ${playerId} (socket ${socket.id}) joined room ${roomName}`);

            // Broadcast updated player count to room
            const playerCount = roomSockets.get(roomName)!.size;
            io.to(roomName).emit('room:players', { count: playerCount });
        });

        // Handle cell changes
        socket.on('cell:change', async ({ puzzleId, row, col, value, playerId }: {
            puzzleId: string;
            row: number;
            col: number;
            value: string;
            playerId: string;
        }) => {
            const roomName = `puzzle:${puzzleId}`;

            // Store in Redis (lazy import to avoid circular deps in tests)
            try {
                const { redis } = await import('./services/redis.js');
                const key = `game:${puzzleId}`;
                const gridStr = await redis.hget(key, 'grid') || '{}';
                const grid = JSON.parse(gridStr);
                grid[`${row},${col}`] = { value, playerId, timestamp: Date.now() };
                await redis.hset(key, 'grid', JSON.stringify(grid));
            } catch (err) {
                console.error('[Socket] Redis error:', err);
            }

            // Broadcast to others in room (exclude sender)
            socket.to(roomName).emit('cell:change', { row, col, value, playerId });

            console.log(`[Socket] Cell change: ${row},${col}=${value} by ${playerId}`);
        });

        // Handle cursor movement
        socket.on('cursor:move', ({ puzzleId, row, col }: {
            puzzleId: string;
            row: number;
            col: number;
        }) => {
            const roomName = `puzzle:${puzzleId}`;
            const playerId = socket.data.playerId;

            // Broadcast cursor position to others in room
            socket.to(roomName).emit('cursor:move', {
                socketId: socket.id,
                playerId,
                row,
                col,
            });
        });

        socket.on('disconnect', () => {
            const { roomName, playerId } = socket.data;

            if (roomName) {
                // Notify others that cursor is gone
                socket.to(roomName).emit('cursor:leave', { socketId: socket.id });

                // Remove socket from room tracking
                const sockets = roomSockets.get(roomName);
                if (sockets) {
                    sockets.delete(socket.id);

                    // Broadcast updated count
                    const playerCount = sockets.size;
                    io.to(roomName).emit('room:players', { count: playerCount });

                    // Clean up empty rooms
                    if (sockets.size === 0) {
                        roomSockets.delete(roomName);
                    }
                }

                console.log(`[Socket] Player ${playerId} (socket ${socket.id}) left room ${roomName}`);
            }

            console.log(`[Socket] Client disconnected: ${socket.id}`);
        });
    });

    return io;
}
