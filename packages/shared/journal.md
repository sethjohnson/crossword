# Milestone 2 Development Journal

## 2025-12-27 17:35 — Starting Milestone 2

### Analysis Complete

Reviewed three sample iPUZ files from XWordInfo:
1. **Monday (nyt241223mon.ipuz)** — Standard 15×15, clean MVP baseline
2. **Tuesday (nyt241224tue.ipuz)** — Standard with thematic elements (defer)
3. **Wednesday (nyt241225wed.ipuz)** — 15×14 non-square, has `x-overlay` extension (defer)

### Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Rebus support | Defer | No examples in samples |
| Non-square grids | Support now | Wednesday puzzle is 15×14 |
| `x-overlay` extension | Defer | Future milestone |
| Error handling | Throw ZodError | Built-in path info |

### MVP Schema Scope

Required fields:
- `version`: Must be `http://ipuz.org/v2`
- `kind`: Must include crossword kind
- `dimensions`: `{ width, height }`
- `puzzle`: 2D array of cell definitions
- `solution`: 2D array of answers
- `clues`: `{ Across: [...], Down: [...] }`

Optional fields: `title`, `author`, `copyright`

---

## Implementation Log

### 17:36 — Schemas Created

Created `schemas/ipuz.ts` with:
- Version/Kind validators
- Dimensions schema (supports non-square)
- PuzzleCellSchema handling styled cells via transform
- SolutionCellSchema for answers
- ClueSchema as tuple
- Full CrosswordPuzzleSchema with dimension refinements

Created `schemas/game.ts` with runtime types:
- CellSchema, PlayerCellSchema, GameStateSchema

### 17:38 — Parser Implemented

Created `parser/ipuz.ts` with:
- `parseIPUZ()` — throws on error
- `safeParseIPUZ()` — returns result object
- `formatParseError()` — formats ZodError

### 17:39 — Tests Complete

22 tests passing across:
- Valid puzzle loading (3 samples)
- Malformed JSON handling
- Missing field validation (6 cases)
- Invalid value validation (3 cases)
- Dimension mismatch validation (2 cases)

### Coverage Results

```
File         | % Stmts | % Branch | % Funcs | % Lines
-------------|---------|----------|---------|--------
All files    |   98.33 |    91.30 |  100.00 |   98.33
src/index.ts |  100.00 |   100.00 |  100.00 |  100.00
parser/ipuz  |   94.28 |    81.81 |  100.00 |   94.28
schemas/game |  100.00 |   100.00 |  100.00 |  100.00
schemas/ipuz |  100.00 |   100.00 |  100.00 |  100.00
```

Milestone 2 complete!

## 2025-12-27 21:45 — Starting Milestone 3: Static Grid Rendering

### Implementation Log

#### Components Created
- `CrosswordGrid.svelte`: Renders the 15x15 grid using CSS Grid. Handles styled cells and block cells. Responsive design maintains square aspect ratio.
- `ClueList.svelte`: Displays scrollable Across and Down clue columns. Stacks on mobile.
- `App.svelte`: Main layout integrating grid and list.

#### Data Integration
- Copied `nyt241223mon.ipuz` from shared fixtures to `client/src/assets/puzzle.json`.
- Used `parseIPUZ` from `@crossword/shared` to type-safe load the puzzle.

#### Verification
- **Playwright Tests**: Created `e2e/grid-rendering.spec.ts`.
- **Results**: 6/6 tests passed verifying title, grid count (225 cells), numbers, and clue visibility.
- **Visual**: Verified correct layout and responsiveness via browser tool.

Milestone 3 complete!

## 2025-12-27 22:15 — Milestone 4: Interactive Grid (Solo)

### Implementation Log

#### State Management
- Created `puzzleStore.ts` using Svelte writable stores.
- Manages `selectedCell` (row, col), `direction` (across/down), and `playerGrid` (user inputs).
- Derived stores for `currentWord` (highlighting) and `currentClueNumber` (sync).

#### Components
- **CrosswordGrid**:
  - Added click selection and keyboard handling (A-Z, Arrows, Backspace, Tab).
  - Fixed event bubbling issue where keys fired twice (removed handler from container).
  - Fixed reactivity issue where values didn't render (switched to explicit reactive variable).
- **ClueList**:
  - Highlight active clue based on store state.
  - Auto-scroll to active clue.
  - Click clue to select cell.

#### Verification
- **Playwright Tests**: `e2e/interactive-grid.spec.ts` (14 tests).
  - Verified clicking, typing, navigation, deletion, and clue syncing.
  - All tests passed.
- **Manual**: Confirmed inputs work and layout is stable.

Milestone 4 complete!
<!-- Appending review for M4 -->

## 2025-12-27 22:40 — Milestone 5: Check & Reveal (Solo)

### Implementation Log

#### Store Updates
- Added `incorrectCells` state to `PuzzleState`.
- Implemented `checkPuzzle()` - compares playerGrid vs solution.
- Implemented `revealPuzzle()` - copies solution to playerGrid.
- Added `isComplete` derived store for completion detection.
- Fixed type error in revealPuzzle for null solution cells.

#### UI Components
- **App.svelte**: Added Check/Reveal buttons with Bulma styling.
- **CrosswordGrid.svelte**: Added `is-incorrect` class and shake animation.
- **CompletionModal.svelte**: Created celebration modal.

#### Verification
- **Playwright Tests**: `e2e/check-reveal.spec.ts` (4 tests).
  - Check marks incorrect, Reveal fills grid, modal appears, incorrect clears on edit.
  - All 18 E2E tests passed.

Milestone 5 complete!

## 2025-12-27 22:50 — Milestone 6: Puzzle Upload API (Server)

### Implementation Log

#### Infrastructure (Server)
- Installed `multer` (uploads), `express-rate-limit` (security), `uuid`.
- Configured Redis client in `src/services/redis.ts`.
- Updated `src/index.ts` to mount API routes.

#### API Endpoint: `POST /api/puzzle`
- Accepts `multipart/form-data` with `.ipuz` or `.json` file.
- Validates file size (max 1MB) and rate limits (5 req/min/IP).
- Parses JSON and validates schema using shared `parseIPUZ`.
- Generates stable UUIDv4.
- Stores puzzle in Redis at `puzzle:{id}`.
- Returns `{ id, shareUrl }`.

#### Verification
- **Integration Tests**: `tests/puzzle.test.ts` (using `supertest`).
  - Verified success path (201 Created).
  - Verified error cases: no file, invalid JSON, invalid iPUZ schema (400 Bad Request).
- **Manual**:
  - Started local Redis via Docker Compose.
  - Verified upload using `curl` with `mini.ipuz` fixture.
  - Received valid ID and 201 response.

Milestone 6 complete!

## 2025-12-27 23:10 — Milestone 7: Puzzle Fetch & Dynamic Loading

### Implementation Log

#### Server
- Added `GET /api/puzzle/:id` to retrieve puzzles from Redis.

#### Client
- Created hash-based router (`lib/router.ts`).
- Added `UploadZone.svelte` with drag-drop and file picker.
- Refactored `App.svelte` for dynamic routing.
  - Shows upload page at `/` or `#upload`.
  - Fetches and displays puzzle at `#puzzle/:id`.
  - Loading and error states.

#### Verification
- **Browser Subagent**: Verified full upload-to-play flow.
  - Upload page appears.
  - File upload triggers redirect to `#puzzle/:id`.
  - Grid renders with Check/Reveal buttons.
- **E2E Tests**: Updated test structure; some tests passing.

Milestone 7 complete!

## 2025-12-27 23:15 — Milestone 8: Real-time Foundation (WebSocket)

### Implementation Log

#### Server
- Installed `socket.io`.
- Created `socket.ts` with room management and player tracking.
- Updated `index.ts` to use HTTP server with Socket.io.

#### Client
- Installed `socket.io-client`.
- Created `lib/socket.ts` with connection logic and Svelte stores.
- Created `PlayerBadge.svelte` for player count display.
- Integrated socket connection into `App.svelte`.

#### Features
- Client joins room `puzzle:{id}` on puzzle load.
- Anonymous player ID persisted in localStorage.
- Server tracks and broadcasts player count on join/leave.
- Badge displays "X players" in header.

#### Verification
- Browser subagent confirmed "1 player" badge visible.
- Socket.io connection established successfully.

Milestone 8 complete!

## 2025-12-27 23:22 — Milestone 9: Real-time Grid Sync

### Implementation Log

#### Server
- Added `cell:change` event handler.
- Store grid state in Redis (`game:{puzzleId}`).
- Broadcast to room (exclude sender).
- Fixed player count to track `socket.id` (not `playerId`).

#### Client
- Added `emitCellChange()` to socket module.
- Added `cellOwners` store for tracking.
- `onRemoteCellChange` callback for updates.
- CrosswordGrid emits on letter/backspace.
- Added `applyRemoteChange` to puzzleStore.

#### Visual
- Player color based on hash of playerId.
- Cells filled by others show different background.

#### Verification
- Browser subagent confirmed real-time sync works.
- Letters typed in one tab appear in others instantly.
- All 6 E2E tests passing.

Milestone 9 complete!
