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
