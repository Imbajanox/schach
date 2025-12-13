<?php
/**
 * Get Roguelike Stats Endpoint
 * Chess Game - Schach
 */

header('Content-Type: application/json');

require_once __DIR__ . '/../../includes/config.php';
require_once __DIR__ . '/../../includes/auth.php';

// Only accept GET requests
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'errors' => ['general' => 'Method not allowed']]);
    exit;
}

// Check if user is authenticated
$userId = auth()->getUserId();
if (!$userId) {
    http_response_code(401);
    echo json_encode(['success' => false, 'errors' => ['general' => 'Authentication required']]);
    exit;
}

try {
    // Get meta progression stats
    $stats = db()->fetchOne(
        "SELECT total_runs, total_victories, highest_zone_reached, meta_currency 
         FROM roguelike_meta_progression 
         WHERE user_id = ?",
        [$userId]
    );
    
    // If no stats exist yet, return defaults
    if (!$stats) {
        $stats = [
            'total_runs' => 0,
            'total_victories' => 0,
            'highest_zone_reached' => 0,
            'meta_currency' => 0
        ];
    }
    
    echo json_encode([
        'success' => true,
        'data' => $stats
    ]);

} catch (Exception $e) {
    error_log("Roguelike get-stats error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'errors' => ['general' => 'Failed to fetch roguelike stats']
    ]);
}
