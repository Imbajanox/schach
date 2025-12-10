<?php
/**
 * User Registration Endpoint
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
$username = trim($input['username'] ?? '');
$email = trim($input['email'] ?? '');
$password = $input['password'] ?? '';
$confirmPassword = $input['confirm_password'] ?? '';

// Validate required fields
$errors = [];

if (empty($username)) {
    $errors['username'] = 'Username is required';
}

if (empty($email)) {
    $errors['email'] = 'Email is required';
}

if (empty($password)) {
    $errors['password'] = 'Password is required';
}

if ($password !== $confirmPassword) {
    $errors['confirm_password'] = 'Passwords do not match';
}

if (!empty($errors)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'errors' => $errors]);
    exit;
}

// Attempt registration
$result = auth()->register($username, $email, $password);

if ($result['success']) {
    // Only auto-login if email verification is not required
    if (!$result['requires_verification']) {
        $loginResult = auth()->login($username, $password);
        
        http_response_code(201);
        echo json_encode([
            'success' => true,
            'message' => $result['message'],
            'user' => $loginResult['user'] ?? null,
            'requires_verification' => false
        ]);
    } else {
        // Email verification required
        http_response_code(201);
        echo json_encode([
            'success' => true,
            'message' => $result['message'],
            'requires_verification' => true
        ]);
    }
} else {
    http_response_code(400);
    echo json_encode($result);
}
