<?php
/**
 * End Roguelike Run Endpoint
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

// Get JSON input
$input = json_decode(file_get_contents('php://input'), true);

if (!$input) {
    http_response_code(400);
    echo json_encode(['success' => false, 'errors' => ['general' => 'Invalid request data']]);
    exit;
}

// Extract input
$runId = intval($input['runId'] ?? 0);
$victory = isset($input['victory']) && $input['victory'] === true;
$finalZone = intval($input['finalZone'] ?? 1);
$finalGold = intval($input['finalGold'] ?? 0);
$upgradesCount = intval($input['upgrades'] ?? 0);
$artifactsCount = intval($input['artifacts'] ?? 0);

// Validate run ID
if ($runId <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'errors' => ['general' => 'Invalid run ID']]);
    exit;
}

try {
    // Verify run belongs to user and is active
    $run = db()->fetchOne(
        "SELECT id, user_id, current_zone, gold FROM roguelike_runs WHERE id = ? AND user_id = ? AND is_active = 1",
        [$runId, $userId]
    );
    
    if (!$run) {
        http_response_code(404);
        echo json_encode(['success' => false, 'errors' => ['general' => 'Run not found or already ended']]);
        exit;
    }
    
    // Calculate score based on zone reached, gold, and victory
    $score = ($finalZone * 100) + $finalGold;
    if ($victory) {
        $score += 1000;  // Bonus for completing all zones
    }
    $score += ($upgradesCount * 10) + ($artifactsCount * 20);
    
    // Update run record
    $completedAt = date('Y-m-d H:i:s');
    db()->update(
        "UPDATE roguelike_runs 
         SET is_active = 0, 
             completed_at = ?, 
             victory = ?, 
             final_score = ?, 
             current_zone = ?, 
             gold = ? 
         WHERE id = ?",
        [$completedAt, $victory ? 1 : 0, $score, $finalZone, $finalGold, $runId]
    );
    
    // Update meta progression
    $metaQuery = "UPDATE roguelike_meta_progression 
                  SET highest_zone_reached = GREATEST(highest_zone_reached, ?)";
    $metaParams = [$finalZone];
    
    if ($victory) {
        $metaQuery .= ", total_victories = total_victories + 1,
                       meta_currency = meta_currency + ?";
        $metaParams[] = intval($finalGold / 10);
    }
    
    $metaQuery .= " WHERE user_id = ?";
    $metaParams[] = $userId;
    
    db()->query($metaQuery, $metaParams);
    
    // Get updated stats
    $stats = db()->fetchOne(
        "SELECT total_runs, total_victories, highest_zone_reached, meta_currency 
         FROM roguelike_meta_progression 
         WHERE user_id = ?",
        [$userId]
    );
    
    echo json_encode([
        'success' => true,
        'data' => [
            'score' => $score,
            'victory' => $victory,
            'stats' => $stats
        ]
    ]);

} catch (Exception $e) {
    error_log("Roguelike end-run error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'errors' => ['general' => 'Failed to end roguelike run']
    ]);
}
