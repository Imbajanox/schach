<?php
/**
 * Start Roguelike Run Endpoint
 * Chess Game - Schach
 */

header('Content-Type: application/json');

require_once __DIR__ . '/../../includes/config.php';
require_once __DIR__ . '/../../includes/auth.php';

// Only accept POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
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
    // Check if user already has an active run
    $existingRun = db()->fetchOne(
        "SELECT id, current_zone, current_encounter, gold 
         FROM roguelike_runs 
         WHERE user_id = ? AND is_active = 1
         LIMIT 1",
        [$userId]
    );
    
    if ($existingRun) {
        // Resume existing run
        echo json_encode([
            'success' => true,
            'data' => [
                'runId' => $existingRun['id'],
                'currentZone' => $existingRun['current_zone'],
                'currentEncounter' => $existingRun['current_encounter'],
                'gold' => $existingRun['gold'],
                'resumed' => true
            ]
        ]);
        exit;
    }
    
    // Start a new run
    $runId = db()->insert('roguelike_runs', [
        'user_id' => $userId,
        'current_zone' => 1,
        'current_encounter' => 1,
        'gold' => 0,
        'is_active' => 1,
        'run_data' => json_encode([
            'startTime' => time(),
            'version' => '1.0'
        ])
    ]);
    
    if (!$runId) {
        throw new Exception('Failed to create roguelike run');
    }
    
    // Update or create meta progression entry
    $metaExists = db()->fetchOne(
        "SELECT id FROM roguelike_meta_progression WHERE user_id = ?",
        [$userId]
    );
    
    if ($metaExists) {
        db()->update('roguelike_meta_progression', 
            ['total_runs' => db()->raw('total_runs + 1')],
            ['user_id' => $userId]
        );
    } else {
        db()->insert('roguelike_meta_progression', [
            'user_id' => $userId,
            'total_runs' => 1,
            'total_victories' => 0,
            'highest_zone_reached' => 0
        ]);
    }
    
    echo json_encode([
        'success' => true,
        'data' => [
            'runId' => $runId,
            'currentZone' => 1,
            'currentEncounter' => 1,
            'gold' => 0,
            'resumed' => false
        ]
    ]);

} catch (Exception $e) {
    error_log("Roguelike start-run error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'errors' => ['general' => 'Failed to start roguelike run']
    ]);
}
