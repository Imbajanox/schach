<?php
/**
 * Session Check Endpoint
 * Returns current user if logged in
 * Chess Game - Schach
 */

header('Content-Type: application/json');

require_once __DIR__ . '/../../includes/config.php';
require_once __DIR__ . '/../../includes/auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'errors' => ['general' => 'Method not allowed']]);
    exit;
}

$user = auth()->getCurrentUser();

if ($user) {
    echo json_encode([
        'success' => true,
        'logged_in' => true,
        'user' => [
            'id' => $user['id'],
            'username' => $user['username'],
            'email' => $user['email'],
            'avatar' => $user['avatar'],
            'elo_rating' => $user['elo_rating'],
            'is_admin' => (bool)$user['is_admin'],
            'games_played' => $user['games_played'] ?? 0,
            'games_won' => $user['games_won'] ?? 0,
            'games_lost' => $user['games_lost'] ?? 0,
            'games_drawn' => $user['games_drawn'] ?? 0
        ]
    ]);
} else {
    echo json_encode([
        'success' => true,
        'logged_in' => false,
        'user' => null
    ]);
}
