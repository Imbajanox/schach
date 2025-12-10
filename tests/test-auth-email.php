<?php
/**
 * Auth and Email Integration Test
 * Tests the complete email verification workflow
 */

// Include configuration and required classes
require_once __DIR__ . '/../includes/config.php';
require_once __DIR__ . '/../includes/database.php';
require_once __DIR__ . '/../includes/auth.php';

echo "=== Auth & Email Verification Test ===\n\n";

// Test credentials
$testUsername = 'testuser_' . time();
$testEmail = 'test_' . time() . '@example.com';
$testPassword = 'Test1234';

echo "Test 1: User Registration\n";
echo "Creating user: $testUsername ($testEmail)\n";

$result = auth()->register($testUsername, $testEmail, $testPassword);

if ($result['success']) {
    echo "✓ Registration successful!\n";
    echo "  User ID: " . $result['user_id'] . "\n";
    echo "  Message: " . $result['message'] . "\n";
    echo "  Requires Verification: " . ($result['requires_verification'] ? 'Yes' : 'No') . "\n";
    
    $userId = $result['user_id'];
    
    // Get the user from database to check verification status
    $user = db()->fetchOne(
        "SELECT id, username, email, is_verified, verification_token, verification_token_expires 
         FROM users WHERE id = ?",
        [$userId]
    );
    
    echo "\nDatabase Check:\n";
    echo "  Username: " . $user['username'] . "\n";
    echo "  Email: " . $user['email'] . "\n";
    echo "  Is Verified: " . ($user['is_verified'] ? 'Yes' : 'No') . "\n";
    echo "  Has Token: " . (!empty($user['verification_token']) ? 'Yes' : 'No') . "\n";
    echo "  Token Expires: " . ($user['verification_token_expires'] ?? 'N/A') . "\n";
    
    if (EMAIL_VERIFICATION_REQUIRED && !empty($user['verification_token'])) {
        echo "\nTest 2: Email Verification\n";
        echo "Verifying with token: " . substr($user['verification_token'], 0, 20) . "...\n";
        
        $verifyResult = auth()->verifyEmail($user['verification_token']);
        
        if ($verifyResult['success']) {
            echo "✓ Email verified successfully!\n";
            echo "  Message: " . $verifyResult['message'] . "\n";
            
            // Check database again
            $verifiedUser = db()->fetchOne(
                "SELECT is_verified, verification_token FROM users WHERE id = ?",
                [$userId]
            );
            
            echo "  Is Verified Now: " . ($verifiedUser['is_verified'] ? 'Yes' : 'No') . "\n";
            echo "  Token Cleared: " . (empty($verifiedUser['verification_token']) ? 'Yes' : 'No') . "\n";
        } else {
            echo "✗ Verification failed\n";
            echo "  Errors: " . json_encode($verifyResult['errors']) . "\n";
        }
        
        echo "\nTest 3: Login After Verification\n";
        $loginResult = auth()->login($testUsername, $testPassword);
        
        if ($loginResult['success']) {
            echo "✓ Login successful!\n";
            echo "  User: " . $loginResult['user']['username'] . "\n";
        } else {
            echo "✗ Login failed\n";
            echo "  Errors: " . json_encode($loginResult['errors']) . "\n";
        }
    } else {
        echo "\nEmail verification not required or already verified.\n";
        
        echo "\nTest 2: Login (without verification)\n";
        $loginResult = auth()->login($testUsername, $testPassword);
        
        if ($loginResult['success']) {
            echo "✓ Login successful!\n";
            echo "  User: " . $loginResult['user']['username'] . "\n";
        } else {
            echo "✗ Login failed\n";
            echo "  Errors: " . json_encode($loginResult['errors']) . "\n";
        }
    }
    
    // Cleanup
    echo "\nCleanup: Deleting test user...\n";
    db()->delete("DELETE FROM users WHERE id = ?", [$userId]);
    echo "✓ Test user deleted\n";
    
} else {
    echo "✗ Registration failed\n";
    echo "  Errors: " . json_encode($result['errors']) . "\n";
}

echo "\n=== Email Logs ===\n";
if (EMAIL_DEV_MODE && file_exists('logs/emails.log')) {
    echo "Email logs written to: logs/emails.log\n";
    echo "Check the file to see verification and welcome emails.\n";
} else {
    echo "No email logs available.\n";
}

echo "\nTest complete!\n";
