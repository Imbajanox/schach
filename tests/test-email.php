<?php
/**
 * Email Service Test
 * Run this script to test email functionality
 */

// Include configuration and email service
require_once __DIR__ . '/../includes/config.php';
require_once __DIR__ . '/../includes/email.php';

echo "=== Email Service Test ===\n\n";

// Test 1: Send verification email
echo "Test 1: Sending verification email...\n";
$testToken = bin2hex(random_bytes(32));
$result = emailService()->sendVerificationEmail(
    'test@example.com',
    'TestUser',
    $testToken
);

if ($result) {
    echo "✓ Verification email sent successfully!\n";
    if (EMAIL_DEV_MODE) {
        echo "  Check logs/emails.log for email content\n";
    }
} else {
    echo "✗ Failed to send verification email\n";
}

echo "\n";

// Test 2: Send welcome email
echo "Test 2: Sending welcome email...\n";
$result = emailService()->sendWelcomeEmail(
    'test@example.com',
    'TestUser'
);

if ($result) {
    echo "✓ Welcome email sent successfully!\n";
    if (EMAIL_DEV_MODE) {
        echo "  Check logs/emails.log for email content\n";
    }
} else {
    echo "✗ Failed to send welcome email\n";
}

echo "\n";

// Display configuration
echo "=== Email Configuration ===\n";
echo "EMAIL_ENABLED: " . (EMAIL_ENABLED ? 'true' : 'false') . "\n";
echo "EMAIL_DEV_MODE: " . (EMAIL_DEV_MODE ? 'true' : 'false') . "\n";
echo "EMAIL_FROM_ADDRESS: " . EMAIL_FROM_ADDRESS . "\n";
echo "EMAIL_FROM_NAME: " . EMAIL_FROM_NAME . "\n";
echo "EMAIL_VERIFICATION_REQUIRED: " . (EMAIL_VERIFICATION_REQUIRED ? 'true' : 'false') . "\n";
echo "EMAIL_VERIFICATION_EXPIRY: " . EMAIL_VERIFICATION_EXPIRY . " seconds (" . (EMAIL_VERIFICATION_EXPIRY / 3600) . " hours)\n";

if (EMAIL_DEV_MODE) {
    echo "\n=== Development Mode Active ===\n";
    echo "Emails are being logged to: logs/emails.log\n";
    echo "No actual emails are sent.\n";
} else {
    echo "\n=== Production Mode Active ===\n";
    if (EMAIL_USE_SMTP) {
        echo "Using SMTP server: " . EMAIL_SMTP_HOST . ":" . EMAIL_SMTP_PORT . "\n";
    } else {
        echo "Using PHP mail() function\n";
    }
}

echo "\nTest complete!\n";
