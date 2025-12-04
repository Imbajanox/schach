<?php
/**
 * User Login Endpoint
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

// Extract input
$identifier = trim($input['identifier'] ?? ''); // username or email
$password = $input['password'] ?? '';
$rememberMe = isset($input['remember_me']) && $input['remember_me'] === true;

// Validate required fields
$errors = [];

if (empty($identifier)) {
    $errors['identifier'] = 'Username or email is required';
}

if (empty($password)) {
    $errors['password'] = 'Password is required';
}

if (!empty($errors)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'errors' => $errors]);
    exit;
}

// Attempt login
$result = auth()->login($identifier, $password, $rememberMe);

if ($result['success']) {
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'Login successful!',
        'user' => $result['user']
    ]);
} else {
    http_response_code(401);
    echo json_encode($result);
}
