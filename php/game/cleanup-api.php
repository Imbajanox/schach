<?php
/**
 * Cleanup API Endpoint
 * GET /php/game/cleanup-api.php?hours=24
 * 
 * Cleans up old abandoned games via web request
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once __DIR__ . '/../../includes/game.php';

$hoursOld = isset($_GET['hours']) ? (int)$_GET['hours'] : 24;

// Limit to reasonable values
if ($hoursOld < 0) $hoursOld = 0;
if ($hoursOld > 720) $hoursOld = 720; // Max 30 days

$gameManager = new Game();

// Get current count
$activeCountBefore = $gameManager->getActiveGamesCount();

// Cleanup old games
$cleaned = $gameManager->cleanupOldGames($hoursOld);

// Get new count
$activeCountAfter = $gameManager->getActiveGamesCount();

echo json_encode([
    'success' => true,
    'active_before' => $activeCountBefore,
    'cleaned' => $cleaned,
    'active_after' => $activeCountAfter,
    'hours_threshold' => $hoursOld
]);
