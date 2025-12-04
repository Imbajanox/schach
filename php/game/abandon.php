<?php
/**
 * Abandon Game API Endpoint
 * POST /php/game/abandon.php
 * 
 * Marks a game as abandoned (e.g., when user reloads page during game)
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once __DIR__ . '/../../includes/database.php';

// Get JSON input
$input = json_decode(file_get_contents('php://input'), true);

if (!$input || !isset($input['game_id'])) {
    echo json_encode(['success' => false, 'error' => 'Missing game_id']);
    exit;
}

$gameId = (int)$input['game_id'];

try {
    $db = Database::getInstance();
    
    // Check if game exists and is still active
    $game = $db->fetchOne("SELECT id, status FROM games WHERE id = ?", [$gameId]);
    
    if (!$game) {
        echo json_encode(['success' => false, 'error' => 'Game not found']);
        exit;
    }
    
    // Only abandon if game is still active or waiting
    if ($game['status'] === 'active' || $game['status'] === 'waiting') {
        $db->update(
            "UPDATE games SET status = 'abandoned', completed_at = NOW() WHERE id = ?",
            [$gameId]
        );
        
        // Add system message
        $db->insert(
            "INSERT INTO game_messages (game_id, message, is_system) VALUES (?, ?, 1)",
            [$gameId, 'Game abandoned (player left)']
        );
        
        echo json_encode(['success' => true, 'message' => 'Game abandoned']);
    } else {
        // Game already ended
        echo json_encode(['success' => true, 'message' => 'Game already ended']);
    }
    
} catch (Exception $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
