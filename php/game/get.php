<?php
/**
 * Get Game Details API Endpoint
 * GET /php/game/get.php?id=<game_id>
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once __DIR__ . '/../../includes/game.php';

$gameId = $_GET['id'] ?? null;

if (!$gameId) {
    echo json_encode(['success' => false, 'error' => 'Missing game ID']);
    exit;
}

$gameManager = new Game();

// Get game details
$game = $gameManager->getGame((int)$gameId);

if (!$game) {
    echo json_encode(['success' => false, 'error' => 'Game not found']);
    exit;
}

// Get moves
$moves = $gameManager->getMoves((int)$gameId);

// Get messages
$messages = $gameManager->getMessages((int)$gameId);

// Generate PGN
$pgn = $gameManager->generatePGN((int)$gameId);

echo json_encode([
    'success' => true,
    'game' => $game,
    'moves' => $moves,
    'messages' => $messages,
    'pgn' => $pgn
]);
