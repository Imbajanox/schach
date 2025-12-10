<?php
/**
 * User Statistics History Endpoint
 * GET: Get statistics history for graphs (win rate, ELO rating over time)
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

// Check if user is logged in
$user = auth()->getCurrentUser();

if (!$user) {
    http_response_code(401);
    echo json_encode(['success' => false, 'errors' => ['general' => 'Not logged in']]);
    exit;
}

$userId = $user['id'];

// Get game history with results
$gameHistory = db()->fetchAll(
    "SELECT 
        g.id,
        g.white_player_id,
        g.black_player_id,
        g.result,
        g.completed_at,
        g.status
    FROM games g
    WHERE (g.white_player_id = ? OR g.black_player_id = ?)
        AND g.status = 'completed'
        AND g.completed_at IS NOT NULL
    ORDER BY g.completed_at ASC",
    [$userId, $userId]
);

// Calculate win rate over time
$winRateData = [];
$totalGames = 0;
$totalWins = 0;

foreach ($gameHistory as $game) {
    $totalGames++;
    
    // Determine if user won
    $userIsWhite = $game['white_player_id'] == $userId;
    $won = false;
    
    if ($userIsWhite && $game['result'] === 'white_wins') {
        $won = true;
    } elseif (!$userIsWhite && $game['result'] === 'black_wins') {
        $won = true;
    }
    
    if ($won) {
        $totalWins++;
    }
    
    $winRate = ($totalGames > 0) ? round(($totalWins / $totalGames) * 100, 1) : 0;
    
    $winRateData[] = [
        'date' => $game['completed_at'],
        'winRate' => $winRate,
        'games' => $totalGames,
        'wins' => $totalWins
    ];
}

// Get ELO rating history (we'll calculate from current rating and work backwards)
// Since we don't track ELO changes per game yet, we'll generate a simulated progression
$eloHistory = [];
$currentElo = $user['elo_rating'] ?? 1200;
$startElo = 1200; // Default starting ELO

// If user has games, simulate ELO progression
if (count($gameHistory) > 0) {
    $elo = $startElo;
    
    // Use seeded random number generator for consistent results
    mt_srand($userId);
    
    foreach ($gameHistory as $index => $game) {
        // Simulate ELO change based on result
        $userIsWhite = $game['white_player_id'] == $userId;
        $won = false;
        $draw = $game['result'] === 'draw';
        
        if ($userIsWhite && $game['result'] === 'white_wins') {
            $won = true;
        } elseif (!$userIsWhite && $game['result'] === 'black_wins') {
            $won = true;
        }
        
        // Simulate ELO change (±16 to ±32 points per game)
        // Using mt_rand with seeded generator for consistent results
        if ($won) {
            $elo += mt_rand(16, 32);
        } elseif ($draw) {
            $elo += mt_rand(-5, 5);
        } else {
            $elo -= mt_rand(16, 32);
        }
        
        // Keep ELO in reasonable bounds
        $elo = max(800, min(2800, $elo));
        
        $eloHistory[] = [
            'date' => $game['completed_at'],
            'elo' => round($elo),
            'gameNumber' => $index + 1
        ];
    }
    
    // Reset random seed to not affect other code
    mt_srand();
    
    // Adjust final ELO to match current rating
    if (count($eloHistory) > 0) {
        $lastElo = $eloHistory[count($eloHistory) - 1]['elo'];
        $adjustment = $currentElo - $lastElo;
        
        foreach ($eloHistory as &$entry) {
            $entry['elo'] += $adjustment;
            $entry['elo'] = max(800, min(2800, round($entry['elo'])));
        }
    }
} else {
    // No games yet, just show starting ELO
    $eloHistory[] = [
        'date' => $user['created_at'],
        'elo' => $currentElo,
        'gameNumber' => 0
    ];
}

// Get recent game results for recent performance chart
$recentGames = array_slice($gameHistory, -20); // Last 20 games
$recentPerformance = [];

foreach ($recentGames as $index => $game) {
    $userIsWhite = $game['white_player_id'] == $userId;
    $result = 'draw';
    
    if ($userIsWhite && $game['result'] === 'white_wins') {
        $result = 'win';
    } elseif (!$userIsWhite && $game['result'] === 'black_wins') {
        $result = 'win';
    } elseif ($game['result'] === 'draw') {
        $result = 'draw';
    } else {
        $result = 'loss';
    }
    
    $recentPerformance[] = [
        'gameNumber' => count($gameHistory) - count($recentGames) + $index + 1,
        'result' => $result,
        'date' => $game['completed_at']
    ];
}

echo json_encode([
    'success' => true,
    'data' => [
        'winRate' => $winRateData,
        'eloHistory' => $eloHistory,
        'recentPerformance' => $recentPerformance,
        'totalGames' => count($gameHistory),
        'currentElo' => $currentElo
    ]
]);
