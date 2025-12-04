<?php
/**
 * User Profile Endpoint
 * GET: Get profile (current user or by ID)
 * PUT: Update current user profile
 * Chess Game - Schach
 */

header('Content-Type: application/json');

require_once __DIR__ . '/../includes/config.php';
require_once __DIR__ . '/../includes/auth.php';

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        handleGetProfile();
        break;
    case 'PUT':
        handleUpdateProfile();
        break;
    default:
        http_response_code(405);
        echo json_encode(['success' => false, 'errors' => ['general' => 'Method not allowed']]);
}

/**
 * Get user profile
 */
function handleGetProfile(): void {
    $userId = isset($_GET['id']) ? (int)$_GET['id'] : null;
    
    if ($userId) {
        // Get specific user's public profile
        $user = auth()->getUserById($userId);
        
        if (!$user) {
            http_response_code(404);
            echo json_encode(['success' => false, 'errors' => ['general' => 'User not found']]);
            return;
        }
        
        echo json_encode([
            'success' => true,
            'user' => $user
        ]);
    } else {
        // Get current user's profile
        $user = auth()->getCurrentUser();
        
        if (!$user) {
            http_response_code(401);
            echo json_encode(['success' => false, 'errors' => ['general' => 'Not logged in']]);
            return;
        }
        
        echo json_encode([
            'success' => true,
            'user' => $user
        ]);
    }
}

/**
 * Update current user's profile
 */
function handleUpdateProfile(): void {
    if (!auth()->isLoggedIn()) {
        http_response_code(401);
        echo json_encode(['success' => false, 'errors' => ['general' => 'Not logged in']]);
        return;
    }
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        http_response_code(400);
        echo json_encode(['success' => false, 'errors' => ['general' => 'Invalid request data']]);
        return;
    }
    
    $userId = $_SESSION['user_id'];
    $result = auth()->updateProfile($userId, $input);
    
    if ($result['success']) {
        echo json_encode($result);
    } else {
        http_response_code(400);
        echo json_encode($result);
    }
}
