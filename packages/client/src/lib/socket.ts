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
let currentPuzzleId: string | null = null;
const playerId = getPlayerId();

// Stores
export const isConnected = writable(false);
export const playerCount = writable(0);
export const cellOwners = writable<Map<string, string>>(new Map()); // key: "row,col", value: playerId

// Remote cursors: Map<socketId, {row, col, playerId}>
export interface RemoteCursor {
    row: number;
    col: number;
    playerId: string;
}
export const remoteCursors = writable<Map<string, RemoteCursor>>(new Map());

// Derived store for display text
export const playerCountText = derived(playerCount, ($count) => {
    if ($count === 0) return '';
    return $count === 1 ? '1 player' : `${$count} players`;
});

export function connectToRoom(puzzleId: string): void {
    if (socket) {
        socket.disconnect();
    }

    currentPuzzleId = puzzleId;

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

    // Listen for remote cell changes
    socket.on('cell:change', ({ row, col, value, playerId: remotePlayerId }: {
        row: number;
        col: number;
        value: string;
        playerId: string;
    }) => {
        console.log(`[Socket] Remote cell change: ${row},${col}=${value} by ${remotePlayerId}`);

        // Update cell owners
        cellOwners.update(owners => {
            const newOwners = new Map(owners);
            if (value) {
                newOwners.set(`${row},${col}`, remotePlayerId);
            } else {
                newOwners.delete(`${row},${col}`);
            }
            return newOwners;
        });

        // Notify any registered callback
        if (onCellChangeCallback) {
            onCellChangeCallback(row, col, value, remotePlayerId);
        }
    });

    // Listen for remote cursor movements
    socket.on('cursor:move', ({ socketId, playerId: remotePlayerId, row, col }: {
        socketId: string;
        playerId: string;
        row: number;
        col: number;
    }) => {
        remoteCursors.update(cursors => {
            const newCursors = new Map(cursors);
            newCursors.set(socketId, { row, col, playerId: remotePlayerId });
            return newCursors;
        });
    });

    // Listen for cursor leaving (player disconnect)
    socket.on('cursor:leave', ({ socketId }: { socketId: string }) => {
        remoteCursors.update(cursors => {
            const newCursors = new Map(cursors);
            newCursors.delete(socketId);
            return newCursors;
        });
    });
}

export function disconnect(): void {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
    currentPuzzleId = null;
    isConnected.set(false);
    playerCount.set(0);
    cellOwners.set(new Map());
    remoteCursors.set(new Map());
}

// Emit cell change to server
export function emitCellChange(row: number, col: number, value: string): void {
    if (socket && currentPuzzleId) {
        socket.emit('cell:change', {
            puzzleId: currentPuzzleId,
            row,
            col,
            value,
            playerId,
        });

        // Update local cell owners
        cellOwners.update(owners => {
            const newOwners = new Map(owners);
            if (value) {
                newOwners.set(`${row},${col}`, playerId);
            } else {
                newOwners.delete(`${row},${col}`);
            }
            return newOwners;
        });
    }
}

// Callback for remote cell changes
let onCellChangeCallback: ((row: number, col: number, value: string, playerId: string) => void) | null = null;

export function onRemoteCellChange(callback: (row: number, col: number, value: string, playerId: string) => void): void {
    onCellChangeCallback = callback;
}

// Throttled cursor move emit (~10/second = 100ms)
let lastCursorEmit = 0;
const CURSOR_THROTTLE_MS = 100;

export function emitCursorMove(row: number, col: number): void {
    const now = Date.now();
    if (socket && currentPuzzleId && now - lastCursorEmit >= CURSOR_THROTTLE_MS) {
        lastCursorEmit = now;
        socket.emit('cursor:move', {
            puzzleId: currentPuzzleId,
            row,
            col,
        });
    }
}

export { playerId };
