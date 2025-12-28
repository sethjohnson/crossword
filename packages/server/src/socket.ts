import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';

// Track player counts per room
const roomPlayers = new Map<string, Set<string>>();

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

            // Store player in room tracking
            if (!roomPlayers.has(roomName)) {
                roomPlayers.set(roomName, new Set());
            }
            roomPlayers.get(roomName)!.add(playerId);

            // Store player info on socket for cleanup
            socket.data.roomName = roomName;
            socket.data.playerId = playerId;

            console.log(`[Socket] Player ${playerId} joined room ${roomName}`);

            // Broadcast updated player count to room
            const playerCount = roomPlayers.get(roomName)!.size;
            io.to(roomName).emit('room:players', { count: playerCount });
        });

        socket.on('disconnect', () => {
            const { roomName, playerId } = socket.data;

            if (roomName && playerId) {
                // Remove player from room tracking
                const players = roomPlayers.get(roomName);
                if (players) {
                    players.delete(playerId);

                    // Broadcast updated count
                    const playerCount = players.size;
                    io.to(roomName).emit('room:players', { count: playerCount });

                    // Clean up empty rooms
                    if (players.size === 0) {
                        roomPlayers.delete(roomName);
                    }
                }

                console.log(`[Socket] Player ${playerId} left room ${roomName}`);
            }

            console.log(`[Socket] Client disconnected: ${socket.id}`);
        });
    });

    return io;
}
