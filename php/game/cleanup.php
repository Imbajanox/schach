<?php
/**
 * Cleanup old/abandoned games
 * Can be run via cron or manually
 * 
 * Usage: php cleanup.php [hours_old]
 * Default: cleans up games older than 24 hours
 */

require_once __DIR__ . '/../includes/game.php';

$hoursOld = isset($argv[1]) ? (int)$argv[1] : 24;

$gameManager = new Game();

// Get current count
$activeCount = $gameManager->getActiveGamesCount();
echo "Active games before cleanup: $activeCount\n";

// Cleanup old games
$cleaned = $gameManager->cleanupOldGames($hoursOld);
echo "Games cleaned up: $cleaned\n";

// Get new count
$activeCountAfter = $gameManager->getActiveGamesCount();
echo "Active games after cleanup: $activeCountAfter\n";
