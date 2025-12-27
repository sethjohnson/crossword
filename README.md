# Crossword Collaboration App

A real-time collaborative crossword puzzle app for friends to solve puzzles together across mobile and desktop browsers.

## 🎯 Core Features

- **Real-time Collaboration**: Multiple users solving the same puzzle simultaneously
- **Cross-platform**: Works on mobile and desktop browsers
- **iPUZ Import**: Upload puzzles in the standard .ipuz format
- **Friend Sessions**: Create private rooms for friends to join

---

## 🏗️ Architecture Overview

### High-Level Components

```
┌─────────────────────────────────────────────────────────────────┐
│                         Clients                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   Mobile    │  │   Desktop   │  │   Tablet    │              │
│  │   Browser   │  │   Browser   │  │   Browser   │              │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘              │
└─────────┼────────────────┼────────────────┼─────────────────────┘
          │                │                │
          └────────────────┼────────────────┘
                           │ WebSocket + REST
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Backend Server                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │   REST API      │  │  WebSocket Hub  │  │  iPUZ Parser    │  │
│  │  (Puzzle CRUD)  │  │  (Real-time)    │  │                 │  │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘  │
│           │                    │                    │           │
│           └────────────────────┼────────────────────┘           │
│                                ▼                                 │
│                    ┌─────────────────────┐                      │
│                    │     Data Layer      │                      │
│                    │  (Puzzle + State)   │                      │
│                    └─────────────────────┘                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔧 Technology Stack

### Frontend: Svelte + Bulma

**Svelte** - Compile-time framework with minimal runtime overhead
- Reactive by default, no virtual DOM
- Small bundle sizes (~10kb vs React's ~40kb+)
- Built-in transitions and animations
- SvelteKit for routing and SSR if needed later

**Bulma** - CSS-only framework (no JS dependencies)
- Clean, modern aesthetic out of the box
- Flexbox-based, responsive by default
- Easy to customize via Sass variables
- Lightweight (~200kb unminified, tree-shakeable)

```
Frontend Stack:
├── Svelte 5 (with runes)
├── Bulma CSS
├── TypeScript
└── Vite (build tool)
```

---

### Backend: Node.js + Express

**Express.js** - Minimal, flexible Node.js framework
- Extensive middleware ecosystem
- Easy WebSocket integration via `ws` or Socket.io
- Simple REST API patterns

```
Backend Stack:
├── Node.js 20+ LTS
├── Express.js
├── TypeScript
├── Socket.io (real-time)
└── Redis (ioredis)
```

---

### Infrastructure: Nginx Reverse Proxy

```
┌──────────────────────────────────────────────────────────────┐
│                         Internet                              │
└──────────────────────────┬───────────────────────────────────┘
                           │ :443 (HTTPS)
                           ▼
┌──────────────────────────────────────────────────────────────┐
│                        Nginx                                  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  • SSL termination                                      │  │
│  │  • Static file serving (Svelte build)                   │  │
│  │  • Gzip compression                                     │  │
│  │  • WebSocket upgrade handling                           │  │
│  │  • Rate limiting                                        │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────┬───────────────────────────────────┘
                           │
          ┌────────────────┴────────────────┐
          │ /api/*                          │ /socket.io/*
          ▼                                 ▼
┌─────────────────────┐           ┌─────────────────────┐
│   Express REST API  │           │  Socket.io Server   │
│      :3000          │           │      :3000          │
└─────────────────────┘           └─────────────────────┘
```

**Nginx responsibilities:**
- SSL/TLS termination (Let's Encrypt)
- Serve static Svelte build files directly
- Proxy `/api/*` and `/socket.io/*` to Express
- Handle WebSocket upgrade headers
- Gzip/Brotli compression
- Basic rate limiting and security headers

---

### Real-time: Socket.io

Socket.io over native WebSocket for:
- Automatic reconnection with exponential backoff
- Room-based broadcasting (one room per game session)
- Fallback to long-polling if WebSocket blocked
- Built-in acknowledgments for critical events

**Open question**: Do we need CRDT-level conflict resolution (Yjs/Automerge), or is simpler last-write-wins sufficient for cell edits?

---

### Data Storage: Redis

For MVP simplicity, we use **Redis as the sole data store**:

- **One service** to run and debug
- **JSON everywhere** — inspect any data with `redis-cli GET key`
- **No migrations** — just keys and JSON values
- **Persistence** via AOF + RDB snapshots

If we later need relational queries or stronger durability guarantees, puzzle JSON can migrate to PostgreSQL 1:1.

#### Redis Key Structure

Since each puzzle upload creates exactly one session, the puzzle ID *is* the session ID:

```
puzzle:{id}         → Combined puzzle + game state JSON
puzzle:{id}:players → SET of connected player IDs (browser session tokens)
```

#### Example Data

**Puzzle with Game State** (`puzzle:abc123`):
```json
{
  "ipuz": {
    "version": "http://ipuz.org/v2",
    "kind": ["http://ipuz.org/crossword#1"],
    "title": "Sunday Funday",
    "author": "Jane Doe",
    "dimensions": { "width": 15, "height": 15 },
    "puzzle": [...],
    "solution": [...],
    "clues": { "Across": [...], "Down": [...] }
  },
  "gameState": {
    "grid": [
      [{ "value": "H", "playerId": "anon_x7k2" }, { "value": "", "playerId": null }, ...],
      ...
    ],
    "startedAt": 1703550000,
    "completed": false
  }
}
```

#### User Identity (Anonymous)

- **No accounts**: Users are anonymous
- **Browser session**: Generate a random token on first visit, store in `localStorage`
- **Same browser = same user**: Token persists across page reloads
- **Different browser/device = different user**: No cross-device identity
- **Nickname**: Optional display name, stored client-side

```
localStorage:
  crossword_user_id: "anon_x7k2"
  crossword_nickname: "Alice"
```

#### Persistence Configuration

```conf
# redis.conf
appendonly yes           # Enable AOF
appendfsync everysec     # Sync every second (good balance)
save 900 1               # RDB snapshot: save if 1 key changed in 15 min
save 300 10              # save if 10 keys changed in 5 min
```

#### Future Migration Path

If needed later, the puzzle JSON maps directly to a PostgreSQL JSONB column:
```sql
CREATE TABLE puzzles (
  id UUID PRIMARY KEY,
  ipuz_data JSONB NOT NULL,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🔒 Security Considerations

### Rate Limiting

**Nginx layer:**
- Limit connections per IP: `limit_conn_zone` (e.g., 10 concurrent)
- Limit requests per second: `limit_req_zone` (e.g., 30 req/s for API)

**Application layer:**
- Socket.io event throttling: max 10 cell changes per second per client
- Puzzle upload limit: 1 upload per minute per IP

### Payload Limits

- Max WebSocket message size: 16KB (a cell change is ~100 bytes)
- Max puzzle upload size: 1MB (typical iPUZ is 10-50KB)
- Reject malformed JSON early

### Session Limits

- Max active sessions per IP: 10 (prevents Redis memory flooding)
- Max players per session: 8 (reasonable for friends-scale)

### Input Validation

- Validate iPUZ structure on upload (dimensions match grid, required fields present)
- Sanitize puzzle title/author (XSS prevention)
- Cell values: only allow A-Z, spaces for rebus

### URL Security

- **Unguessable puzzle IDs**: Use UUIDv4 (e.g., `a1b2c3d4-e5f6-7890-abcd-ef1234567890`)
- Prevents enumeration attacks (can't guess `/puzzle/1`, `/puzzle/2`, etc.)

### CORS

- Configure Express CORS middleware to allow only the frontend origin
- In production: restrict to your domain
- In development: allow `localhost:5173` (Vite default)

---

## ✅ Validation Strategy

### Library: Zod

Use **Zod** for schema validation with TypeScript type inference:
- Define schema once → get runtime validation AND TypeScript types
- Mature ecosystem, excellent documentation
- Handles complex nested structures (like iPUZ) elegantly

### When to Use What

| Entry Point | Approach | Why |
|-------------|----------|-----|
| iPUZ upload (`POST /api/puzzle`) | **Full Zod schema** | Runs once per upload, complexity justified |
| WebSocket cell changes | **Simple `if` checks** | Runs constantly, must be fast |
| Redis reads | **Trust (we wrote it)** | Optional sanity checks |

### Example: iPUZ Validation (Zod)

```typescript
import { z } from 'zod';

const CellSchema = z.union([
  z.literal('#'),  // block
  z.number(),      // clue number
  z.string(),      // empty or letter
]);

const PuzzleSchema = z.object({
  version: z.string(),
  kind: z.array(z.string()),
  dimensions: z.object({
    width: z.number().min(1).max(30),
    height: z.number().min(1).max(30),
  }),
  puzzle: z.array(z.array(CellSchema)),
  solution: z.array(z.array(z.string())).optional(),
  clues: z.object({
    Across: z.array(z.tuple([z.number(), z.string()])),
    Down: z.array(z.tuple([z.number(), z.string()])),
  }),
});

type Puzzle = z.infer<typeof PuzzleSchema>;
```

### Example: WebSocket Validation (Simple)

```typescript
// Fast validation for high-frequency events
function isValidCellChange(data: unknown, width: number, height: number): boolean {
  if (typeof data !== 'object' || data === null) return false;
  const { row, col, value } = data as Record<string, unknown>;
  return (
    Number.isInteger(row) && (row as number) >= 0 && (row as number) < height &&
    Number.isInteger(col) && (col as number) >= 0 && (col as number) < width &&
    typeof value === 'string' && /^[A-Z]?$/.test(value)
  );
}
```

### Shared Types Architecture

Zod schemas can be shared between frontend and backend:

```
packages/
├── shared/
│   ├── schemas/
│   │   ├── puzzle.ts    ← Zod schemas
│   │   └── events.ts    ← WebSocket event types
│   └── package.json
├── server/              ← imports from @crossword/shared
└── client/              ← imports from @crossword/shared
```

---

## 📦 Data Models

### Puzzle (from iPUZ)
```typescript
interface Puzzle {
  id: string;
  title: string;
  author: string;
  copyright: string;
  dimensions: { width: number; height: number };
  grid: Cell[][];       // The puzzle structure
  clues: {
    across: Clue[];
    down: Clue[];
  };
  solution: string[][];  // The answers
}

interface Cell {
  type: 'letter' | 'block' | 'empty';
  number?: number;       // Clue number if start of word
  solution?: string;     // Correct letter(s) - can be multi-char for rebus
  
  // iPUZ extended features
  style?: {
    circle?: boolean;           // Circled cell (common in themed puzzles)
    shaded?: boolean;           // Shaded/highlighted cell
    backgroundColor?: string;   // Custom background color
  };
  bars?: {
    top?: boolean;              // Bar/barrier on top edge
    right?: boolean;            // Bar on right edge
    bottom?: boolean;           // Bar on bottom edge
    left?: boolean;             // Bar on left edge
  };
}

interface Clue {
  number: number;
  text: string;
  answer: string;        // Can be multi-char per cell for rebus
}
```

### Game Session
```typescript
interface GameSession {
  id: string;
  puzzleId: string;
  createdAt: Date;
  players: Player[];
  state: GameState;
}

interface Player {
  id: string;
  name: string;
  color: string;         // Cursor/highlight color
  cursor?: CursorPosition;
}

interface GameState {
  grid: PlayerCell[][];  // Current state of player entries
  timer?: number;        // Optional timer in seconds
  completed: boolean;
}

interface PlayerCell {
  value: string;
  playerId?: string;     // Who entered this letter
  timestamp: number;
  isCorrect?: boolean;   // For check mode
}
```

---

## 🔄 Real-time Sync Strategy

### Approach: Server-Authoritative Event Sourcing

Each cell change is an event, with the **server as the source of truth**:

1. Client sends cell change to server
2. Server assigns authoritative timestamp/sequence number
3. Server broadcasts to all clients (including sender)
4. Clients apply changes in server-determined order

This prevents race conditions where high-latency clients see different final states.

```typescript
// Client sends
interface CellChangeRequest {
  position: { row: number; col: number };
  value: string;
}

// Server broadcasts (with authority)
interface CellChangeEvent {
  type: 'CELL_CHANGE';
  sessionId: string;
  playerId: string;
  position: { row: number; col: number };
  value: string;
  sequence: number;        // Server-assigned ordering
  serverTimestamp: number; // Server-assigned time
}
```

### Future: CRDT Upgrade Path

If we need offline support or more complex conflict resolution:
- Yjs or Automerge for the grid state
- Automatic merge of concurrent edits
- Would require more significant refactor

---

## 🎮 Game Logic

### iPUZ Validation (on upload)

- Dimensions match actual grid size
- Required fields present: `dimensions`, `puzzle`, `clues`
- Clue numbers correspond to valid grid positions
- Solution provided (required for check/reveal features)

### Completion Detection

Server checks completion when:
- Any cell changes (efficient: only check affected word)
- Player requests explicit check

A puzzle is **complete** when all letter cells contain the correct solution value.

### Check & Reveal (Multiplayer Policy)

**Options** (configurable per session):
1. **Individual check**: Only requester sees correctness highlights
2. **Shared check**: All players see which cells are wrong
3. **Reveal disabled**: No reveal in competitive mode

Default for friends: Shared check, reveal allowed (collaborative, not competitive).

---

## 📱 Mobile Considerations

### Input Strategy: Native Keyboard + Pan/Zoom

For MVP, use the **native mobile keyboard** and let users pan/zoom the grid:

- Simpler to implement — no custom keyboard component
- Users can zoom in on the area they're working on
- Pinch-to-zoom and drag-to-pan on the grid
- Keyboard appears when a cell is tapped, grid adjusts

**Tradeoff**: Layout will jump when keyboard opens/closes, but acceptable for MVP.

**Future enhancement**: Custom on-screen keyboard if user feedback demands it.

### Layout & Touch

- **Touch-friendly grid**: Large tap targets (44px minimum per cell)
- **Zoomable grid**: Allow pinch-to-zoom for precision on small screens
- **Reset view button**: Quick way to return to full-grid view after zooming
- **Responsive layout**: Clues collapse/expand on mobile, swipe between grid and clues
- **Gesture support**: Swipe to change direction, double-tap to toggle direction

### Accessibility

- **Screen readers**: Use `role="grid"` with proper `aria-label` per cell
- **Clue announcements**: Announce current clue when cell focused
- **Keyboard navigation**: Full arrow key support for desktop users
- **High contrast**: Ensure sufficient contrast for cell states (selected, correct, incorrect)

---

## 🚀 MVP Scope

### Phase 1: Solo Play
- [ ] Parse and display iPUZ files
- [ ] Basic grid interaction
- [ ] Clue display and navigation
- [ ] Check/reveal functionality

### Phase 2: Multiplayer
- [ ] Create/join game sessions
- [ ] Real-time grid sync
- [ ] Player cursors visible
- [ ] Basic chat or reactions

### Phase 3: Polish
- [ ] Timer and completion stats
- [ ] Puzzle library/history
- [ ] User accounts (optional)
- [ ] Mobile optimizations

---

## 🤔 Open Questions

1. **Svelte routing**: Plain Svelte 5 + Vite, or SvelteKit for file-based routing?

---

## ✅ Decisions Made

| Decision | Choice |
|----------|--------|
| User accounts | No — anonymous with browser `localStorage` token |
| Puzzle sources | iPUZ upload only |
| Session sharing | URL-based invite links (e.g., `/puzzle/abc123`) |
| Sessions per puzzle | One session per upload |
| Mobile keyboard | Native keyboard + pan/zoom |
| Real-time sync | Server-authoritative, not CRDT |
| Data storage | Redis only (for MVP) |

---

## 📚 References

- [iPUZ Format Specification](https://www.puzzazz.com/ipuz)
- [Socket.io Documentation](https://socket.io/docs/)
- [Yjs CRDT Library](https://yjs.dev/)
- [Bulma CSS Documentation](https://bulma.io/documentation/)
- [Svelte 5 Documentation](https://svelte.dev/docs)

---

*Last updated: December 2024*
