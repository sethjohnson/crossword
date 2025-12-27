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
- Hash-based routing (`#puzzle/abc123`) — simple SPA, no SSR needed

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
├── Vite (build tool)
└── Hash-based routing (no SvelteKit)
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

Use **Zod** for all schema validation:
- Define schema once → get runtime validation AND TypeScript types
- Consistent validation approach across the entire codebase
- Handles complex nested structures (like iPUZ) elegantly
- For MVP, consistency > micro-optimization

### Validation Points

| Entry Point | Schema |
|-------------|--------|
| iPUZ upload (`POST /api/puzzle`) | `PuzzleSchema` — full iPUZ structure |
| WebSocket cell change | `CellChangeSchema` — position + value |
| WebSocket cursor move | `CursorMoveSchema` — position |

### Example Schemas

```typescript
import { z } from 'zod';

// iPUZ puzzle structure
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

// WebSocket events
const CellChangeSchema = z.object({
  row: z.number().int().min(0),
  col: z.number().int().min(0),
  value: z.string().regex(/^[A-Z]?$/),  // single letter or empty
});

const CursorMoveSchema = z.object({
  row: z.number().int().min(0),
  col: z.number().int().min(0),
});

// Infer types from schemas
type Puzzle = z.infer<typeof PuzzleSchema>;
type CellChange = z.infer<typeof CellChangeSchema>;
```

### Shared Types Architecture

Zod schemas live in `packages/shared` and are imported by both client and server:

```
packages/
├── shared/
│   ├── schemas/
│   │   ├── puzzle.ts    ← iPUZ schemas
│   │   └── events.ts    ← WebSocket event schemas
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
}

interface Clue {
  number: number;
  text: string;
  answer: string;
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
  completed: boolean;
}

interface PlayerCell {
  value: string;
  playerId?: string;     // Who entered this letter
}
```

---

## 🔄 Real-time Sync Strategy

### Approach: Simple Broadcast (Last-Write-Wins)

For MVP, use straightforward event broadcasting:

1. Client sends cell change to server
2. Server validates and stores in Redis
3. Server broadcasts to all clients in the room
4. Clients apply changes as they arrive

**Conflict handling**: If two users edit the same cell simultaneously, the last event processed by the server wins. For a friends app, this is rare and acceptable.

```typescript
// Client sends
interface CellChangeRequest {
  row: number;
  col: number;
  value: string;
}

// Server broadcasts
interface CellChangeEvent {
  type: 'CELL_CHANGE';
  playerId: string;
  row: number;
  col: number;
  value: string;
}
```

### Future: Ordered Events

If stricter ordering is needed:
- Server assigns sequence numbers to events
- Clients buffer and reorder if events arrive out of sequence
- Move to CRDT (Yjs/Automerge) for offline support

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

### Check & Reveal

For MVP, all check/reveal actions are **shared** with all players:
- Check cell/word/puzzle highlights incorrect cells for everyone
- Reveal shows the answer to everyone
- Collaborative approach — not competitive

---

## 📱 Mobile Considerations

### Input Strategy: Native Keyboard + Browser Zoom

For MVP, rely on **native browser capabilities**:

- Use native mobile keyboard (appears when cell tapped)
- Use native browser pinch-to-zoom (no custom zoom code)
- Set viewport meta: `<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5">`

**Tradeoff**: Layout jumps when keyboard opens, but acceptable for MVP.

### Layout & Touch

- **Touch-friendly grid**: Large tap targets (44px minimum per cell)
- **Responsive layout**: Clues collapse/expand on mobile
- **Direction toggle**: Tap selected cell to toggle across/down

### Accessibility (MVP basics)

- **Keyboard navigation**: Arrow key support for desktop users
- **Focus indicators**: Clear visual focus on selected cell

---

## 🧪 Multi-User Testing Strategy

Since multiplayer is the core feature, prioritize testing with multiple users from the start:

### Local Development

| Approach | How | Best for |
|----------|-----|----------|
| **Multiple browser tabs** | Open 2+ tabs to same URL; each gets unique `localStorage` ID automatically | Quick manual testing |
| **Incognito + regular** | One regular window + one incognito = two isolated users | Testing identity isolation |
| **Multiple browsers** | Chrome + Firefox + Safari | True cross-browser testing |

### Automated Testing (Playwright)

Use Playwright's multi-context feature to simulate multiple users:

```typescript
test('two users can see each other\'s edits', async ({ browser }) => {
  const userA = await browser.newContext();
  const userB = await browser.newContext();
  
  const pageA = await userA.newPage();
  const pageB = await userB.newPage();
  
  await pageA.goto('#puzzle/test123');
  await pageB.goto('#puzzle/test123');
  
  // User A types a letter
  await pageA.click('[data-cell="0-0"]');
  await pageA.keyboard.type('A');
  
  // User B should see it
  await expect(pageB.locator('[data-cell="0-0"]')).toHaveText('A');
});
```

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

## 📅 MVP Work Schedule

A sequenced roadmap of implementation milestones. Each milestone is **independently testable** and builds on the previous one. Aim for **working software at every step**.

### Milestone 1: Project Foundation
> **Goal**: Dev environment, build pipeline, and test harness in place.

- [ ] Initialize monorepo structure (`packages/shared`, `packages/server`, `packages/client`)
- [ ] Configure TypeScript, ESLint, and Prettier with shared configs
- [ ] Set up Vite for the Svelte client with HMR
- [ ] Set up Express server skeleton with health check endpoint
- [ ] Add Vitest for unit tests; configure coverage thresholds
- [ ] Add Playwright for end-to-end tests (empty test suite)
- [ ] Create Docker Compose for local Redis
- [ ] Create `npm run dev` script that starts client, server, and Redis together
- [ ] **Quality gate**: `npm test` passes, `npm run dev` starts all services, health check responds

---

### Milestone 2: Shared Types & iPUZ Parsing
> **Goal**: Robust puzzle data model that both client and server trust.

- [ ] Define Zod schemas in `shared/` for iPUZ structure (core subset)
- [ ] Export TypeScript types inferred from Zod schemas
- [ ] Implement `parseIPUZ()` function with validation and clear error messages
- [ ] Add unit tests for valid iPUZ, malformed JSON, missing fields, edge cases
- [ ] Support common iPUZ variations (numbered cells, blocks, empty cells)
- [ ] **Quality gate**: 100% test coverage on parser; sample puzzles load without error

---

### Milestone 3: Static Grid Rendering (Client)
> **Goal**: Display a parsed puzzle in the browser, read-only.

- [ ] Create `<CrosswordGrid>` Svelte component (renders cell structure)
- [ ] Create `<ClueList>` Svelte component (Across/Down lists)
- [ ] Apply Bulma styling; ensure mobile-friendly with CSS grid
- [ ] Load a hardcoded sample puzzle and render it
- [ ] Add Playwright test: grid renders correct dimensions, clues visible
- [ ] **Quality gate**: Visual inspection on desktop + mobile viewports; Playwright passes

---

### Milestone 4: Interactive Grid (Solo, No Backend)
> **Goal**: Single-player puzzle interaction in client only.

- [ ] Implement cell selection (click/tap to select)
- [ ] Implement keyboard input (A-Z fills cell, arrow keys navigate)
- [ ] Implement direction toggle (tap selected cell or Tab key)
- [ ] Highlight current word based on direction
- [ ] Sync clue highlight with selected cell
- [ ] Store player grid state in Svelte stores
- [ ] **Quality gate**: Manual playthrough of a full puzzle; Playwright interaction tests

---

### Milestone 5: Check & Reveal (Solo)
> **Goal**: Players can verify progress against solution.

- [ ] Implement "Check puzzle" (highlight all incorrect cells, shared with all players)
- [ ] Implement "Reveal puzzle" with confirmation (shared with all players)
- [ ] Add visual states: correct (green flash), incorrect (red shake)
- [ ] Detect puzzle completion → show celebration modal
- [ ] Unit tests for correctness logic; Playwright tests for UI states
- [ ] **Quality gate**: Complete puzzle with check/reveal working correctly

---

### Milestone 6: Puzzle Upload API
> **Goal**: Server accepts iPUZ file and returns stable puzzle ID.

- [ ] `POST /api/puzzle` endpoint: accept multipart file upload
- [ ] Server-side Zod validation (reuse shared schemas)
- [ ] Generate UUIDv4 as puzzle ID
- [ ] Store puzzle JSON in Redis (`puzzle:{id}`)
- [ ] Return `{ id, shareUrl }` on success; return 400 with errors otherwise
- [ ] Add rate limiting (1 upload/min/IP) and size limit (1MB)
- [ ] Integration tests with supertest; test error cases
- [ ] **Quality gate**: Upload via curl works; invalid files rejected with helpful errors

---

### Milestone 7: Puzzle Fetch & Dynamic Loading
> **Goal**: Client loads puzzle from server by URL.

- [ ] `GET /api/puzzle/:id` endpoint: return puzzle JSON
- [ ] Client hash route `#puzzle/:id` → fetches puzzle from API
- [ ] Loading and error states in UI
- [ ] Upload UI in client: drag-drop or file picker → upload → redirect to `#puzzle/:id`
- [ ] Playwright e2e: upload file → redirected → puzzle renders
- [ ] **Quality gate**: Full upload-to-play flow works end-to-end

---

### Milestone 8: Real-time Foundation (WebSocket)
> **Goal**: Establish Socket.io connection, but no game sync yet.

- [ ] Add Socket.io server with connection/disconnection logging
- [ ] Client connects on puzzle page; joins room `puzzle:{id}`
- [ ] Assign anonymous player ID from localStorage (generate if missing)
- [ ] Broadcast player count on join/leave
- [ ] Display "X players connected" badge in UI
- [ ] Handle reconnection gracefully (Socket.io built-in)
- [ ] **Quality gate**: Two browser tabs show correct player count

---

### Milestone 9: Real-time Grid Sync
> **Goal**: Cell edits broadcast to all players in real-time.

- [ ] On cell change: emit `cell:change` event to server
- [ ] Server validates, stores in Redis, broadcasts to room (no sequence numbers)
- [ ] Clients apply changes as they arrive (last-write-wins)
- [ ] Show who filled each cell (colored border or player color)
- [ ] Multi-tab manual test; Playwright multi-context test (see Testing Strategy section)
- [ ] **Quality gate**: Type in one tab → appears instantly in another

---

### Milestone 10: Cursor Presence
> **Goal**: See where other players are focused.

- [ ] Emit `cursor:move` events on cell selection change
- [ ] Render remote cursor indicators (colored highlight + player name)
- [ ] Throttle cursor events to ~10/second
- [ ] Clean up cursors on player disconnect
- [ ] **Quality gate**: Two players see each other's cursor in real-time

---

### Milestone 11: Session Persistence & Rejoin
> **Goal**: Close browser, return to same session, continue where you left off.

- [ ] Game state persisted to Redis on every change (already done in M9)
- [ ] On GET `/api/puzzle/:id`, include current gameState in response
- [ ] Client initializes grid from `gameState.grid` instead of blank
- [ ] Player rejoins same room with same ID if token matches
- [ ] **Quality gate**: Fill some cells → close tab → reopen URL → state restored

---

### Milestone 12: Production Deployment
> **Goal**: App runs on a public server with HTTPS.

- [ ] Dockerfile for server (Node + static client build)
- [ ] Nginx config for SSL termination, static serving, proxy to backend
- [ ] Docker Compose for production (nginx, node, redis)
- [ ] Let's Encrypt certificate provisioning (certbot)
- [ ] Environment variable configuration (Redis host, allowed origins)
- [ ] Health check and basic monitoring (console logs to start)
- [ ] **Quality gate**: Friends can access via public URL and play together

---

### Milestone 13: Polish & Edge Cases
> **Goal**: Handle the "real world" gracefully.

- [ ] Friendly error pages (puzzle not found, server error)
- [ ] Handle Redis disconnection without crashing
- [ ] Session expiration (puzzles expire after 7 days of inactivity)
- [ ] Mobile keyboard handling (viewport adjustments, scroll behavior)
- [ ] **Quality gate**: Test on real phones; share with beta users for feedback

---

### 🏁 MVP Complete Criteria

The MVP is **done** when:

1. A user can upload a `.ipuz` file via the web UI
2. They receive a shareable link
3. Friends can join via the link and see each other's cursors
4. All players see real-time cell updates
5. Check/reveal functions work
6. Sessions persist across page reloads
7. The app is deployed and accessible via HTTPS

---

---

## ✅ Decisions Made

| Decision | Choice |
|----------|--------|
| User accounts | No — anonymous with browser `localStorage` token |
| Puzzle sources | iPUZ upload only |
| Session sharing | URL-based invite links (e.g., `#puzzle/abc123`) |
| Sessions per puzzle | One session per upload |
| Mobile keyboard | Native keyboard + browser zoom |
| Real-time sync | Simple broadcast, last-write-wins |
| Data storage | Redis only (for MVP) |
| Routing | Hash-based SPA (`#puzzle/:id`), no SvelteKit |

---

## � Future Enhancements (Post-MVP)

Features deferred to keep MVP simple:

### Cell Features
- **Circles**: Circled cells for themed puzzles
- **Shading**: Background colors and shaded cells
- **Bars**: Barrier lines between cells (British-style grids)

### Game State
- **Timer**: Track solve time per session
- **Per-cell timestamps**: Track when each cell was filled
- **Correctness state**: Persist `isCorrect` per cell (currently computed on-demand)

### Check/Reveal Modes
- **Individual check**: Only requester sees correctness
- **Reveal disabled**: For competitive play

### Accessibility
- **Screen readers**: Full ARIA labeling with `role="grid"` and `aria-label` per cell
- **Clue announcements**: Announce current clue when cell focused
- **High contrast mode**: Enhanced contrast for cell states

### Mobile UX
- **Custom keyboard**: On-screen A-Z keyboard to prevent layout jumps
- **Custom pinch-to-zoom**: In-app zoom controls with reset view button
- **Advanced gestures**: Swipe to change direction, double-tap toggle

### Real-time Sync
- **Sequence ordering**: Server-assigned sequence numbers with client reordering
- **CRDT sync**: Yjs/Automerge for offline support and automatic merge

### Infrastructure
- **PostgreSQL migration**: For analytics, history, and durability
- **User accounts**: Optional login for cross-device sessions

---

## �📚 References

- [iPUZ Format Specification](https://www.puzzazz.com/ipuz)
- [Socket.io Documentation](https://socket.io/docs/)
- [Yjs CRDT Library](https://yjs.dev/)
- [Bulma CSS Documentation](https://bulma.io/documentation/)
- [Svelte 5 Documentation](https://svelte.dev/docs)

---

*Last updated: December 2024*
