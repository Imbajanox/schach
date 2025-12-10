<?php
/**
 * Email Verification Endpoint
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

// Get token from query parameter
$token = trim($_GET['token'] ?? '');

if (empty($token)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'errors' => ['token' => 'Verification token is required']]);
    exit;
}

// Verify email
$result = auth()->verifyEmail($token);

if ($result['success']) {
    http_response_code(200);
    echo json_encode($result);
} else {
    http_response_code(400);
    echo json_encode($result);
}
