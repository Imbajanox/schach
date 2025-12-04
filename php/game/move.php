<?php
/**
 * Save Move API Endpoint
 * POST /php/game/move.php
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once __DIR__ . '/../../includes/game.php';

// Get JSON input
$input = json_decode(file_get_contents('php://input'), true);

if (!$input) {
    echo json_encode(['success' => false, 'error' => 'Invalid JSON input']);
    exit;
}

// Validate required fields
$requiredFields = ['game_id', 'move_number', 'player_color', 'from', 'to', 'piece_type', 'notation', 'fen'];
foreach ($requiredFields as $field) {
    if (!isset($input[$field])) {
        echo json_encode(['success' => false, 'error' => "Missing required field: $field"]);
        exit;
    }
}

$moveData = [
    'move_number' => (int)$input['move_number'],
    'player_color' => $input['player_color'],
    'from' => $input['from'],
    'to' => $input['to'],
    'piece_type' => $input['piece_type'],
    'captured_piece' => $input['captured_piece'] ?? null,
    'is_check' => $input['is_check'] ?? false,
    'is_checkmate' => $input['is_checkmate'] ?? false,
    'castling' => $input['castling'] ?? null,
    'en_passant' => $input['en_passant'] ?? false,
    'promotion' => $input['promotion'] ?? null,
    'notation' => $input['notation'],
    'fen' => $input['fen'],
    'time_spent' => $input['time_spent'] ?? null,
    'white_time_remaining' => $input['white_time_remaining'] ?? null,
    'black_time_remaining' => $input['black_time_remaining'] ?? null
];

$gameManager = new Game();
$result = $gameManager->saveMove((int)$input['game_id'], $moveData);

echo json_encode($result);
