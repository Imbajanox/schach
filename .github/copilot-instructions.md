# Schach Chess Game - Copilot Instructions

## Project Overview
Web-based chess game with complete rules, AI opponent (minimax + alpha-beta pruning), user authentication, and email verification. Runs on WAMP stack (Windows, Apache, MySQL, PHP 8.x).

## Architecture

### Frontend (Vanilla JS, no frameworks)
- **Entry**: `index.html` loads scripts in strict order - **order matters for global dependencies**
- **Load sequence**: `constants.js` → `utils.js` → `pieces.js` → `board.js` → `game.js` → `ai.js` → `ui.js` → `auth.js` → `gameApi.js` → `main.js`
- **Global instances**: Created in `main.js` - `board`, `game`, `ui`, `chessTimer`, `chessAI`, `gameAPI`
- **Initialization**: `init()` in `main.js` sets up callbacks and event listeners

### Core Game Classes
| File | Class/Object | Purpose |
|------|--------------|---------|
| `js/game.js` | `ChessGame` | Game state, turn management, move validation, history tracking |
| `js/pieces.js` | `Pieces` (static object) | Move generation per piece type, check detection, makeMove() simulation |
| `js/ai.js` | `ChessAI` | Minimax with alpha-beta pruning, transposition tables, opening book |
| `js/board.js` | `Board` | DOM rendering, drag-drop handlers, square highlighting |
| `js/gameApi.js` | `GameAPI` | Server communication for game persistence |
| `js/constants.js` | Constants | `COLORS`, `PIECE_TYPES`, `GAME_STATES`, `INITIAL_POSITION` |
| `js/utils.js` | `Utils` (static object) | Square notation parsing, position cloning, validation helpers |

### Backend (PHP 8.x)
- **Singleton pattern**: `Database`, `Auth`, `EmailService` - access via helper functions
- **Helper functions**: `db()`, `auth()`, `emailService()` in respective `includes/*.php` files
- **Database**: `Database` class with fluent methods: `query()`, `fetchOne()`, `fetchAll()`, `insert()`, `update()`, `delete()`
- **Auth**: `Auth` class handles registration, login, sessions, email verification, password changes
- **Email**: `EmailService` singleton with dev mode (logs to `logs/emails.log`) and production SMTP
- **API endpoints**: All in `php/auth/*.php` and `php/game/*.php`, return JSON, accept `Content-Type: application/json`
- **Session handling**: Always initialized in `includes/config.php`

### Database Schema (`sql/schema.sql`)
Tables: `users`, `user_stats`, `games`, `moves`, `sessions`
- `users`: has `verification_token`, `verification_token_expires`, `is_verified` for email verification
- `games`: references `white_player_id`, `black_player_id` (FK to users)
- `moves`: stores algebraic notation + FEN for each move
- `sessions`: stores `remember_token` for persistent login
- Foreign keys cascade on delete

## Critical Conventions

### JavaScript
- **Position cloning**: Always use `Utils.deepClone(position)` - spread operator fails on nested objects
- **Position format**: `{ 'e2': { type: 'pawn', color: 'white' }, 'e4': null }` (squares with no pieces = not in object)
- **Square notation**: Algebraic string (`'e2'`, `'d4'`) ↔ coords via `Utils.parseSquare()` / `Utils.toSquare()`
- **Colors**: Use `COLORS.WHITE`, `COLORS.BLACK` - never string literals
- **Piece types**: Use `PIECE_TYPES.PAWN`, etc. - never string literals
- **Move objects**: `{ to: 'e4', capture: true, promotion: 'queen', castling: 'kingside', enPassant: true }`
- **Move records** (after execution): `{ from: 'e2', to: 'e4', piece: 'pawn', color: 'white', notation: 'e4', fen: '...' }`

### PHP
- **Always require config first**: `require_once __DIR__ . '/../../includes/config.php';` (adjust path)
- **Then require dependencies**: `require_once __DIR__ . '/../../includes/auth.php';`
- **JSON headers**: `header('Content-Type: application/json');` before any output
- **Accept JSON input**: `$input = json_decode(file_get_contents('php://input'), true);`
- **Error responses**: `['success' => false, 'errors' => ['field' => 'message']]` - errors is associative array
- **Success responses**: `['success' => true, 'data' => [...]]` or `['success' => true]`
- **Database access**: Use `db()->query($sql, $params)` with prepared statements - NEVER concatenate user input
- **Helper methods**: `db()->fetchOne()`, `db()->fetchAll()`, `db()->insert()` return values (lastInsertId, row count)
- **Transactions**: `db()->beginTransaction()`, `db()->commit()`, `db()->rollback()`

### Email System
- **Dev mode** (`EMAIL_DEV_MODE = true`): Logs to `logs/emails.log`, doesn't send
- **Production**: Set `EMAIL_USE_SMTP = true`, configure SMTP credentials in `includes/config.php`
- **Verification**: Token expires in 24 hours (`EMAIL_VERIFICATION_EXPIRY`), can be disabled with `EMAIL_VERIFICATION_REQUIRED = false`
- **Templates**: HTML templates in `templates/email/*.html` with placeholder substitution

## Key Workflows

### Adding New Chess Logic
1. Piece moves: Modify `Pieces.getValidMoves()` switch in `js/pieces.js` - each piece has dedicated method
2. Special moves: Update `Pieces.getPawnMoves()` for en passant, `Pieces.getKingMoves()` for castling
3. Legal moves: `ChessGame.getValidMoves()` filters out self-check using `Pieces.makeMove()` simulation

### Game State Flow
```javascript
// 1. Initialize
game.newGame({ mode: GAME_MODES.VS_AI, playerColor: COLORS.WHITE, difficulty: AI_DIFFICULTIES.MEDIUM })

// 2. Get moves for selected square
const moves = game.getValidMoves('e2') // Returns move objects filtered for legality

// 3. Execute move
game.makeMove('e2', 'e4') // Updates position, history, triggers callbacks (onMove, onTurnChange)

// 4. Check game state
game.checkGameState() // Returns { isCheck, isCheckmate, isStalemate, isDraw } and triggers onGameOver
```

### AI Integration
- **Difficulty**: Set depth via `chessAI.setDifficulty('easy'|'medium'|'hard')` - updates `maxDepth` and `maxThinkTime`
- **Get move**: `chessAI.getBestMove(position, color, gameState)` - returns `{ from, to, move }` or null
- **Callbacks**: Set `chessAI.onThinkingStart`, `onThinkingEnd` for UI updates

### Authentication API Pattern
```javascript
// Frontend (js/auth.js)
fetch('/php/auth/login.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password, rememberMe })
})

// Backend (php/auth/login.php)
$input = json_decode(file_get_contents('php://input'), true);
$result = auth()->login($input['identifier'], $input['password'], $input['rememberMe'] ?? false);
echo json_encode($result);
```

## Development Setup
- **Stack**: WAMP64 on Windows (Apache + MySQL + PHP 8.x)
- **Database**: Create `schach` database, import `sql/schema.sql`
- **Config**: Edit `includes/config.php` - set `DEBUG_MODE = true`, `EMAIL_DEV_MODE = true` for local dev
- **URL**: `http://localhost/schach`
- **Testing**: Use `tests/*.php` scripts - run via browser or CLI
- **Migrations**: Apply in order from `sql/migrations/*.sql` for schema updates

## Common Tasks

### Add New API Endpoint
1. Create `php/auth/new-endpoint.php` or `php/game/new-endpoint.php`
2. Template:
```php
<?php
header('Content-Type: application/json');
require_once __DIR__ . '/../../includes/config.php';
require_once __DIR__ . '/../../includes/auth.php'; // if needed

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'errors' => ['general' => 'Method not allowed']]);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
// ... validation and logic ...
echo json_encode(['success' => true, 'data' => $result]);
```

### Debug Email in Dev Mode
- Emails logged to `logs/emails.log` - tail this file to see what would be sent
- HTML templates in `templates/email/*.html` - test with `tests/test-email.php`
- Skip verification entirely: Set `EMAIL_VERIFICATION_REQUIRED = false` in config

### Modify AI Evaluation
- Piece values: `PIECE_VALUES` object in `js/ai.js` (pawn: 100, knight: 320, etc.)
- Positional bonuses: `pawnTable`, `knightTable`, etc. in `ChessAI.initPieceSquareTables()`
- Evaluation function: `ChessAI.evaluatePosition()` - combines material + positional + mobility + king safety

## Current Status
✅ Complete chess rules, AI (3 difficulties), authentication, email verification  
🟡 In progress: Profile pages, statistics tracking  
🔲 Planned: Online multiplayer, time controls, ELO ratings, matchmaking
