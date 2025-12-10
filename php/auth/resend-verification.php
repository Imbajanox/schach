<?php
/**
 * Resend Verification Email Endpoint
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

// Get JSON input
$input = json_decode(file_get_contents('php://input'), true);

if (!$input) {
    http_response_code(400);
    echo json_encode(['success' => false, 'errors' => ['general' => 'Invalid request data']]);
    exit;
}

// Extract and sanitize input
$email = trim($input['email'] ?? '');

// Validate required fields
if (empty($email)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'errors' => ['email' => 'Email is required']]);
    exit;
}

// Resend verification email
$result = auth()->resendVerificationEmail($email);

if ($result['success']) {
    http_response_code(200);
    echo json_encode($result);
} else {
    http_response_code(400);
    echo json_encode($result);
}
