# Schach Chess Game - Copilot Instructions

## Project Overview
A web-based chess game with complete rules implementation, AI opponent (minimax + alpha-beta pruning), and user authentication. Runs on WAMP stack (Windows, Apache, MySQL, PHP).

## Architecture

### Frontend (Vanilla JS, no frameworks)
- **Entry**: `index.html` loads all scripts in order
- **Script load order matters**: `constants.js` → `utils.js` → `pieces.js` → `board.js` → `game.js` → `ai.js` → `ui.js` → `auth.js` → `gameApi.js` → `main.js`
- **Global instances**: `chessAI`, `gameAPI` are created at module level and used throughout

### Core Game Classes
| File | Class/Object | Purpose |
|------|--------------|---------|
| `js/game.js` | `ChessGame` | Game state, turns, move validation, FEN handling |
| `js/pieces.js` | `Pieces` (static) | Move generation, attack detection, position manipulation |
| `js/ai.js` | `ChessAI` | Minimax search, position evaluation, opening book |
| `js/board.js` | Board rendering, drag-drop | DOM manipulation for chessboard |
| `js/gameApi.js` | `GameAPI` | Server communication, game persistence |

### Backend (PHP 8.x)
- **Singleton Database**: `includes/database.php` - use `db()` helper function
- **Auth**: `includes/auth.php` - use `auth()` helper function  
- **API pattern**: PHP endpoints return JSON, accept `Content-Type: application/json`
- **Session handling**: Always starts in `includes/config.php`

### Database Schema (`sql/schema.sql`)
Key tables: `users`, `user_stats`, `games`, `moves`, `sessions`
- Games reference players via `white_player_id`, `black_player_id`
- Moves store algebraic notation and FEN after each move
- Foreign keys cascade on delete

## Conventions

### JavaScript
- Use `Utils.deepClone()` for position copying (not spread operator for nested objects)
- Position format: `{ 'e2': { type: 'pawn', color: 'white' }, ... }`
- Square notation: algebraic (`e2`, `d4`) converted via `Utils.parseSquare()` / `Utils.toSquare()`
- Colors: `COLORS.WHITE`, `COLORS.BLACK` from `constants.js`
- Piece types: `PIECE_TYPES.PAWN`, etc. from `constants.js`

### PHP
- Always require config first: `require_once __DIR__ . '/../../includes/config.php';`
- Return JSON: `header('Content-Type: application/json'); echo json_encode([...]);`
- Use prepared statements via `db()->query()` or helper methods
- Error responses: `['success' => false, 'errors' => ['field' => 'message']]`
- Success responses: `['success' => true, 'data' => [...]]`

### Move Representation
```javascript
// Internal move object
{ to: 'e4', capture: true, promotion: 'queen', castling: 'kingside', enPassant: true }

// Move record (after execution)
{ from: 'e2', to: 'e4', piece: 'pawn', color: 'white', notation: 'e4', fen: '...' }
```

## Key Patterns

### Adding New Piece Logic
Modify `Pieces.getValidMoves()` switch statement in `js/pieces.js`. Each piece type has dedicated method (e.g., `getPawnMoves`, `getKnightMoves`).

### Game State Flow
1. `ChessGame.newGame()` → initializes position from `INITIAL_POSITION`
2. `ChessGame.getValidMoves(square)` → filters legal moves (no self-check)
3. `ChessGame.makeMove(from, to)` → updates state, triggers callbacks
4. `ChessGame.checkGameState()` → detects check/checkmate/stalemate/draws

### AI Difficulty Levels
| Level | Depth | Time Limit | Notes |
|-------|-------|------------|-------|
| Easy | 2 | 1s | 30% random move chance |
| Medium | 3 | 3s | Standard search |
| Hard | 4 | 5s | Full evaluation |

### Authentication Flow
1. Frontend: `auth.js` handles forms, calls `/php/auth/*.php`
2. Backend: `Auth` class validates, manages sessions
3. Persistent login: `sessions` table + `remember_token` cookie

## Development Environment
- **Stack**: WAMP64 (localhost)
- **Database**: MySQL `schach` - run `sql/schema.sql` to initialize
- **Config**: `includes/config.php` - set `DEBUG_MODE = true` for development
- **URL**: `http://localhost/schach`

## Current Status (from roadmap.md)
- ✅ Complete chess rules, AI opponent, authentication
- 🟡 In progress: v1.0 (Account system + Basic AI)
- 🔲 Planned: Online multiplayer, time controls, matchmaking
