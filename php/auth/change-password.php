<?php
/**
 * Change Password Endpoint
 * Chess Game - Schach
 */

header('Content-Type: application/json');

require_once __DIR__ . '/../../includes/config.php';
require_once __DIR__ . '/../../includes/auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'errors' => ['general' => 'Method not allowed']]);
    exit;
}

if (!auth()->isLoggedIn()) {
    http_response_code(401);
    echo json_encode(['success' => false, 'errors' => ['general' => 'Not logged in']]);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);

if (!$input) {
    http_response_code(400);
    echo json_encode(['success' => false, 'errors' => ['general' => 'Invalid request data']]);
    exit;
}

$currentPassword = $input['current_password'] ?? '';
$newPassword = $input['new_password'] ?? '';
$confirmPassword = $input['confirm_password'] ?? '';

// Validate
$errors = [];

if (empty($currentPassword)) {
    $errors['current_password'] = 'Current password is required';
}

if (empty($newPassword)) {
    $errors['new_password'] = 'New password is required';
}

if ($newPassword !== $confirmPassword) {
    $errors['confirm_password'] = 'Passwords do not match';
}

if (!empty($errors)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'errors' => $errors]);
    exit;
}

$result = auth()->changePassword($_SESSION['user_id'], $currentPassword, $newPassword);

if ($result['success']) {
    echo json_encode($result);
} else {
    http_response_code(400);
    echo json_encode($result);
}
