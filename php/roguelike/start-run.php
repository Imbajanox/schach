<?php
/**
 * Start Roguelike Run Endpoint
 * Chess Game - Schach
 */

header('Content-Type: application/json');

require_once __DIR__ . '/../../includes/config.php';
require_once __DIR__ . '/../../includes/auth.php';

// --- CORS Headers (Crucial for the Preflight Request) ---
header("Access-Control-Allow-Origin: *"); // Or specify your dev environment origin (e.g., http://localhost:8080)
header("Access-Control-Allow-Methods: POST, OPTIONS"); // Allow POST and OPTIONS
header("Access-Control-Allow-Headers: Content-Type"); // Allow the custom header we send

// --- Handle Preflight OPTIONS Request ---
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    // Respond to the preflight without running the main POST logic
    http_response_code(200);
    exit;
}

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
    $runData = json_encode([
        'startTime' => time(),
        'version' => '1.0'
    ]);
    
    $runId = db()->insert(
        "INSERT INTO roguelike_runs (user_id, current_zone, current_encounter, gold, is_active, run_data) 
         VALUES (?, ?, ?, ?, ?, ?)",
        [$userId, 1, 1, 0, 1, $runData]
    );
    
    if (!$runId) {
        throw new Exception('Failed to create roguelike run');
    }
    
    // Update or create meta progression entry
    $metaExists = db()->fetchOne(
        "SELECT id FROM roguelike_meta_progression WHERE user_id = ?",
        [$userId]
    );
    
    if ($metaExists) {
        db()->update(
            "UPDATE roguelike_meta_progression SET total_runs = total_runs + 1 WHERE user_id = ?",
            [$userId]
        );
    } else {
        db()->insert(
            "INSERT INTO roguelike_meta_progression (user_id, total_runs, total_victories, highest_zone_reached) 
             VALUES (?, ?, ?, ?)",
            [$userId, 1, 0, 0]
        );
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
