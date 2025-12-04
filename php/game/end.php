<?php
/**
 * End Game API Endpoint
 * POST /php/game/end.php
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
if (!isset($input['game_id']) || !isset($input['result']) || !isset($input['reason'])) {
    echo json_encode(['success' => false, 'error' => 'Missing required fields: game_id, result, reason']);
    exit;
}

$resultData = [
    'result' => $input['result'],
    'reason' => $input['reason']
];

$gameManager = new Game();
$result = $gameManager->endGame((int)$input['game_id'], $resultData);

echo json_encode($result);
