<?php
/**
 * Add Game Message API Endpoint
 * POST /php/game/message.php
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

// Validate required fields
if (!isset($input['game_id']) || !isset($input['message'])) {
    echo json_encode(['success' => false, 'error' => 'Missing required fields: game_id, message']);
    exit;
}

// Get current user if logged in
$auth = new Auth();
$currentUser = $auth->getCurrentUser();
$userId = $currentUser ? $currentUser['id'] : null;

$gameManager = new Game();
$messageId = $gameManager->addMessage(
    (int)$input['game_id'],
    $userId,
    $input['message'],
    $input['is_system'] ?? false
);

echo json_encode([
    'success' => true,
    'message_id' => $messageId
]);
