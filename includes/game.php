<?php
/**
 * Game Management Class
 * Schach - Chess Game
 */

require_once __DIR__ . '/database.php';
require_once __DIR__ . '/auth.php';

class Game {
    private $db;
    
    public function __construct() {
        $this->db = Database::getInstance();
    }
    
    /**
     * Create a new game
     */
    public function createGame(array $options): array {
        $whitePlayerId = $options['white_player_id'] ?? null;
        $blackPlayerId = $options['black_player_id'] ?? null;
        $gameType = $options['game_type'] ?? 'pvp_local';
        $aiDifficulty = $options['ai_difficulty'] ?? null;
        $timeControl = $options['time_control'] ?? null;
        $increment = $options['increment'] ?? 0;
        
        // Set initial remaining times (same as time_control, or null for unlimited)
        $whiteTimeRemaining = $timeControl;
        $blackTimeRemaining = $timeControl;
        
        $sql = "INSERT INTO games (
            white_player_id, black_player_id, game_type, ai_difficulty,
            time_control, increment, status, started_at, fen_initial, fen_current,
            white_time_remaining, black_time_remaining
        ) VALUES (?, ?, ?, ?, ?, ?, 'active', NOW(), ?, ?, ?, ?)";
        
        $initialFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
        
        $gameId = $this->db->insert($sql, [
            $whitePlayerId,
            $blackPlayerId,
            $gameType,
            $aiDifficulty,
            $timeControl,
            $increment,
            $initialFen,
            $initialFen,
            $whiteTimeRemaining,
            $blackTimeRemaining
        ]);
        
        // Add system message
        $this->addMessage($gameId, null, 'Game started', true);
        
        return [
            'success' => true,
            'game_id' => $gameId,
            'time_control' => $timeControl,
            'white_time_remaining' => $whiteTimeRemaining,
            'black_time_remaining' => $blackTimeRemaining
        ];
    }
    
    /**
     * Get game by ID
     */
    public function getGame(int $gameId): ?array {
        $sql = "SELECT g.*, 
                       w.username as white_username, w.elo_rating as white_elo,
                       b.username as black_username, b.elo_rating as black_elo
                FROM games g
                LEFT JOIN users w ON g.white_player_id = w.id
                LEFT JOIN users b ON g.black_player_id = b.id
                WHERE g.id = ?";
        
        return $this->db->fetchOne($sql, [$gameId]);
    }
    
    /**
     * Save a move
     */
    public function saveMove(int $gameId, array $moveData): array {
        // Validate game exists and is active
        $game = $this->getGame($gameId);
        if (!$game) {
            return ['success' => false, 'error' => 'Game not found'];
        }
        
        if ($game['status'] !== 'active') {
            return ['success' => false, 'error' => 'Game is not active'];
        }
        
        $sql = "INSERT INTO moves (
            game_id, move_number, player_color, move_from, move_to,
            piece_type, captured_piece, is_check, is_checkmate,
            is_castling, is_en_passant, promotion_piece, algebraic_notation,
            fen_after, time_spent
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        
        $moveId = $this->db->insert($sql, [
            $gameId,
            $moveData['move_number'],
            $moveData['player_color'],
            $moveData['from'],
            $moveData['to'],
            $moveData['piece_type'],
            $moveData['captured_piece'] ?? null,
            $moveData['is_check'] ? 1 : 0,
            $moveData['is_checkmate'] ? 1 : 0,
            $moveData['castling'] ?? null,
            $moveData['en_passant'] ? 1 : 0,
            $moveData['promotion'] ?? null,
            $moveData['notation'],
            $moveData['fen'],
            $moveData['time_spent'] ?? null
        ]);
        
        // Update game's current FEN, move count, and remaining times
        $nextTurn = $moveData['player_color'] === 'white' ? 'black' : 'white';
        
        // Build update query with optional time fields
        $updateFields = [
            'fen_current = ?',
            'move_count = move_count + 1',
            'current_turn = ?'
        ];
        $updateParams = [$moveData['fen'], $nextTurn];
        
        // Add time remaining fields if provided
        if (isset($moveData['white_time_remaining'])) {
            $updateFields[] = 'white_time_remaining = ?';
            $updateParams[] = $moveData['white_time_remaining'];
        }
        if (isset($moveData['black_time_remaining'])) {
            $updateFields[] = 'black_time_remaining = ?';
            $updateParams[] = $moveData['black_time_remaining'];
        }
        
        $updateParams[] = $gameId;
        $updateSql = "UPDATE games SET " . implode(', ', $updateFields) . " WHERE id = ?";
        
        $this->db->update($updateSql, $updateParams);
        
        return [
            'success' => true,
            'move_id' => $moveId
        ];
    }
    
    /**
     * End a game
     */
    public function endGame(int $gameId, array $resultData): array {
        $game = $this->getGame($gameId);
        if (!$game) {
            return ['success' => false, 'error' => 'Game not found'];
        }
        
        $result = $resultData['result']; // 'white_wins', 'black_wins', 'draw'
        $reason = $resultData['reason']; // 'checkmate', 'resignation', 'stalemate', etc.
        
        $sql = "UPDATE games SET 
                status = 'completed',
                result = ?,
                result_reason = ?,
                completed_at = NOW()
                WHERE id = ?";
        
        $this->db->update($sql, [$result, $reason, $gameId]);
        
        // Add system message
        $message = $this->formatGameEndMessage($result, $reason);
        $this->addMessage($gameId, null, $message, true);
        
        // Update player statistics if applicable
        $this->updatePlayerStats($game, $result);
        
        return ['success' => true];
    }
    
    /**
     * Format game end message
     */
    private function formatGameEndMessage(string $result, string $reason): string {
        $messages = [
            'checkmate' => $result === 'white_wins' ? 'White wins by checkmate!' : 'Black wins by checkmate!',
            'resignation' => $result === 'white_wins' ? 'Black resigned. White wins!' : 'White resigned. Black wins!',
            'stalemate' => 'Game drawn by stalemate.',
            'insufficient_material' => 'Game drawn due to insufficient material.',
            'fifty_move_rule' => 'Game drawn by the 50-move rule.',
            'threefold_repetition' => 'Game drawn by threefold repetition.',
            'agreement' => 'Game drawn by mutual agreement.',
            'timeout' => $result === 'white_wins' ? 'Black ran out of time. White wins!' : 'White ran out of time. Black wins!'
        ];
        
        return $messages[$reason] ?? 'Game ended.';
    }
    
    /**
     * Update player statistics after game
     */
    private function updatePlayerStats(array $game, string $result): void {
        $whiteId = $game['white_player_id'];
        $blackId = $game['black_player_id'];
        
        if (!$whiteId && !$blackId) {
            return; // Guest game, no stats to update
        }
        
        // Determine outcomes
        $whiteWon = $result === 'white_wins';
        $blackWon = $result === 'black_wins';
        $isDraw = $result === 'draw';
        
        // Update white player stats
        if ($whiteId) {
            $this->updateUserStats($whiteId, $whiteWon, $blackWon, $isDraw);
        }
        
        // Update black player stats
        if ($blackId) {
            $this->updateUserStats($blackId, $blackWon, $whiteWon, $isDraw);
        }
    }
    
    /**
     * Update a single user's stats
     */
    private function updateUserStats(int $userId, bool $won, bool $lost, bool $draw): void {
        $sql = "INSERT INTO user_stats (user_id, games_played, games_won, games_lost, games_drawn)
                VALUES (?, 1, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    games_played = games_played + 1,
                    games_won = games_won + ?,
                    games_lost = games_lost + ?,
                    games_drawn = games_drawn + ?,
                    current_win_streak = IF(?, current_win_streak + 1, 0),
                    longest_win_streak = GREATEST(longest_win_streak, IF(?, current_win_streak + 1, 0))";
        
        $wonInt = $won ? 1 : 0;
        $lostInt = $lost ? 1 : 0;
        $drawInt = $draw ? 1 : 0;
        
        $this->db->query($sql, [
            $userId, $wonInt, $lostInt, $drawInt,
            $wonInt, $lostInt, $drawInt,
            $won, $won
        ]);
    }
    
    /**
     * Add a message to the game
     */
    public function addMessage(int $gameId, ?int $userId, string $message, bool $isSystem = false): int {
        $sql = "INSERT INTO game_messages (game_id, user_id, message, is_system)
                VALUES (?, ?, ?, ?)";
        
        return $this->db->insert($sql, [$gameId, $userId, $message, $isSystem ? 1 : 0]);
    }
    
    /**
     * Get messages for a game
     */
    public function getMessages(int $gameId): array {
        $sql = "SELECT gm.*, u.username
                FROM game_messages gm
                LEFT JOIN users u ON gm.user_id = u.id
                WHERE gm.game_id = ?
                ORDER BY gm.created_at ASC";
        
        return $this->db->fetchAll($sql, [$gameId]);
    }
    
    /**
     * Get all moves for a game (for review)
     */
    public function getMoves(int $gameId): array {
        $sql = "SELECT * FROM moves WHERE game_id = ? ORDER BY move_number, player_color";
        return $this->db->fetchAll($sql, [$gameId]);
    }
    
    /**
     * Get game history for a user
     */
    public function getUserGames(int $userId, int $limit = 10, int $offset = 0): array {
        $sql = "SELECT g.*, 
                       w.username as white_username,
                       b.username as black_username
                FROM games g
                LEFT JOIN users w ON g.white_player_id = w.id
                LEFT JOIN users b ON g.black_player_id = b.id
                WHERE (g.white_player_id = ? OR g.black_player_id = ?)
                AND g.status = 'completed'
                ORDER BY g.completed_at DESC
                LIMIT ? OFFSET ?";
        
        return $this->db->fetchAll($sql, [$userId, $userId, $limit, $offset]);
    }
    
    /**
     * Generate PGN for a game
     */
    public function generatePGN(int $gameId): ?string {
        $game = $this->getGame($gameId);
        if (!$game) {
            return null;
        }
        
        $moves = $this->getMoves($gameId);
        
        // Build PGN headers
        $pgn = "[Event \"Schach Online Game\"]\n";
        $pgn .= "[Site \"Schach Chess\"]\n";
        $pgn .= "[Date \"" . date('Y.m.d', strtotime($game['created_at'])) . "\"]\n";
        $pgn .= "[White \"" . ($game['white_username'] ?? 'Guest') . "\"]\n";
        $pgn .= "[Black \"" . ($game['black_username'] ?? ($game['game_type'] === 'vs_ai' ? 'Computer' : 'Guest')) . "\"]\n";
        
        // Result
        $resultMap = [
            'white_wins' => '1-0',
            'black_wins' => '0-1',
            'draw' => '1/2-1/2',
            'ongoing' => '*'
        ];
        $pgn .= "[Result \"" . ($resultMap[$game['result']] ?? '*') . "\"]\n\n";
        
        // Build move text
        $moveText = '';
        $moveNum = 1;
        foreach ($moves as $move) {
            if ($move['player_color'] === 'white') {
                $moveText .= $moveNum . '. ' . $move['algebraic_notation'] . ' ';
            } else {
                $moveText .= $move['algebraic_notation'] . ' ';
                $moveNum++;
            }
        }
        
        $moveText .= $resultMap[$game['result']] ?? '*';
        $pgn .= wordwrap($moveText, 80) . "\n";
        
        return $pgn;
    }
    
    /**
     * Abandon a game
     */
    public function abandonGame(int $gameId): bool {
        $game = $this->getGame($gameId);
        if (!$game) {
            return false;
        }
        
        if ($game['status'] !== 'active' && $game['status'] !== 'waiting') {
            return false; // Already ended
        }
        
        $sql = "UPDATE games SET 
                status = 'abandoned',
                completed_at = NOW()
                WHERE id = ?";
        
        $this->db->update($sql, [$gameId]);
        
        // Add system message
        $this->addMessage($gameId, null, 'Game abandoned (player left)', true);
        
        return true;
    }
    
    /**
     * Cleanup old abandoned/stuck games
     * Call this periodically (e.g., via cron) to clean up games that were never finished
     */
    public function cleanupOldGames(int $hoursOld = 24): int {
        // Mark very old active games as abandoned
        $sql = "UPDATE games 
                SET status = 'abandoned', completed_at = NOW()
                WHERE status IN ('active', 'waiting')
                AND created_at < DATE_SUB(NOW(), INTERVAL ? HOUR)";
        
        return $this->db->update($sql, [$hoursOld]);
    }
    
    /**
     * Get count of active games (for debugging)
     */
    public function getActiveGamesCount(): int {
        $result = $this->db->fetchOne(
            "SELECT COUNT(*) as count FROM games WHERE status IN ('active', 'waiting')"
        );
        return (int)($result['count'] ?? 0);
    }
}

/**
 * Helper function to get game instance
 */
function game(): Game {
    static $instance = null;
    if ($instance === null) {
        $instance = new Game();
    }
    return $instance;
}
