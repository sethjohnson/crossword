import { io, Socket } from 'socket.io-client';
import { writable, derived } from 'svelte/store';

// Generate or retrieve player ID
function getPlayerId(): string {
    const key = 'crossword_player_id';
    let id = localStorage.getItem(key);
    if (!id) {
        id = crypto.randomUUID();
        localStorage.setItem(key, id);
    }
    return id;
}

// Socket state
let socket: Socket | null = null;
const playerId = getPlayerId();

// Stores
export const isConnected = writable(false);
export const playerCount = writable(0);

// Derived store for display text
export const playerCountText = derived(playerCount, ($count) => {
    if ($count === 0) return '';
    return $count === 1 ? '1 player' : `${$count} players`;
});

export function connectToRoom(puzzleId: string): void {
    if (socket) {
        socket.disconnect();
    }

    // Connect to server (uses Vite proxy in dev)
    socket = io({
        path: '/socket.io',
        transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
        console.log('[Socket] Connected:', socket?.id);
        isConnected.set(true);

        // Join the puzzle room
        socket?.emit('room:join', { puzzleId, playerId });
    });

    socket.on('disconnect', () => {
        console.log('[Socket] Disconnected');
        isConnected.set(false);
        playerCount.set(0);
    });

    socket.on('room:players', ({ count }: { count: number }) => {
        console.log('[Socket] Player count:', count);
        playerCount.set(count);
    });

    socket.on('connect_error', (err) => {
        console.error('[Socket] Connection error:', err.message);
    });
}

export function disconnect(): void {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
    isConnected.set(false);
    playerCount.set(0);
}

export { playerId };
