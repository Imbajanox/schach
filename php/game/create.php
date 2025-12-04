<?php
/**
 * Create Game API Endpoint
 * POST /php/game/create.php
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once __DIR__ . '/../../includes/game.php';
require_once __DIR__ . '/../../includes/auth.php';

// Get JSON input
$input = json_decode(file_get_contents('php://input'), true);

if (!$input) {
    echo json_encode(['success' => false, 'error' => 'Invalid JSON input']);
    exit;
}

// Get current user if logged in
$auth = new Auth();
$currentUser = $auth->getCurrentUser();

// Determine player IDs based on game type and player color
$gameType = $input['game_type'] ?? 'pvp_local';
$playerColor = $input['player_color'] ?? 'white';
$aiDifficulty = $input['ai_difficulty'] ?? null;

$whitePlayerId = null;
$blackPlayerId = null;

if ($currentUser) {
    if ($playerColor === 'white') {
        $whitePlayerId = $currentUser['id'];
    } else {
        $blackPlayerId = $currentUser['id'];
    }
}

// Create game options
$options = [
    'white_player_id' => $whitePlayerId,
    'black_player_id' => $blackPlayerId,
    'game_type' => $gameType,
    'ai_difficulty' => $gameType === 'vs_ai' ? $aiDifficulty : null,
    'time_control' => $input['time_control'] ?? null,
    'increment' => $input['increment'] ?? 0
];

$gameManager = new Game();
$result = $gameManager->createGame($options);

echo json_encode($result);
