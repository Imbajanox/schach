<?php
/**
 * Complete Email Verification Workflow Test
 * Simulates full user journey: Register -> Verify -> Login
 */

require_once __DIR__ . '/../includes/config.php';
require_once __DIR__ . '/../includes/database.php';
require_once __DIR__ . '/../includes/auth.php';

echo "=== Complete Email Verification Workflow Test ===\n\n";

// Test credentials
$testUsername = 'wtest_' . substr(time(), -6);
$testEmail = 'wf_' . time() . '@example.com';
$testPassword = 'Test1234!';

// Step 1: Registration
echo "Step 1: User Registration\n";
echo str_repeat('-', 50) . "\n";
echo "Username: $testUsername\n";
echo "Email: $testEmail\n\n";

$registerResult = auth()->register($testUsername, $testEmail, $testPassword);

if (!$registerResult['success']) {
    echo "✗ Registration failed!\n";
    echo "Errors: " . json_encode($registerResult['errors']) . "\n";
    exit(1);
}

echo "✓ Registration successful!\n";
echo "  User ID: " . $registerResult['user_id'] . "\n";
echo "  Message: " . $registerResult['message'] . "\n";
echo "  Requires Verification: " . ($registerResult['requires_verification'] ? 'Yes' : 'No') . "\n\n";

$userId = $registerResult['user_id'];

// Step 2: Get verification token from database
echo "Step 2: Retrieve Verification Token\n";
echo str_repeat('-', 50) . "\n";

$user = db()->fetchOne(
    "SELECT verification_token, verification_token_expires, is_verified 
     FROM users WHERE id = ?",
    [$userId]
);

if (!$user) {
    echo "✗ User not found in database!\n";
    exit(1);
}

echo "  Token: " . substr($user['verification_token'], 0, 40) . "...\n";
echo "  Expires: " . $user['verification_token_expires'] . "\n";
echo "  Currently Verified: " . ($user['is_verified'] ? 'Yes' : 'No') . "\n\n";

$verificationToken = $user['verification_token'];

// Step 3: Attempt login before verification (should fail if verification required)
if (EMAIL_VERIFICATION_REQUIRED) {
    echo "Step 3: Attempt Login Before Verification\n";
    echo str_repeat('-', 50) . "\n";
    
    $loginResult = auth()->login($testUsername, $testPassword);
    
    if ($loginResult['success']) {
        echo "✗ Login should have failed (email not verified)!\n";
        exit(1);
    }
    
    echo "✓ Login correctly prevented (email not verified)\n";
    echo "  Error: " . ($loginResult['errors']['general'] ?? 'Unknown') . "\n";
    echo "  Requires Verification Flag: " . ($loginResult['requires_verification'] ?? false ? 'Yes' : 'No') . "\n\n";
}

// Step 4: Verify email
echo "Step 4: Verify Email\n";
echo str_repeat('-', 50) . "\n";

$verifyResult = auth()->verifyEmail($verificationToken);

if (!$verifyResult['success']) {
    echo "✗ Email verification failed!\n";
    echo "Errors: " . json_encode($verifyResult['errors']) . "\n";
    exit(1);
}

echo "✓ Email verified successfully!\n";
echo "  Message: " . $verifyResult['message'] . "\n";
echo "  Username: " . $verifyResult['username'] . "\n\n";

// Step 5: Verify database state
echo "Step 5: Verify Database State\n";
echo str_repeat('-', 50) . "\n";

$verifiedUser = db()->fetchOne(
    "SELECT is_verified, verification_token, verification_token_expires 
     FROM users WHERE id = ?",
    [$userId]
);

echo "  Is Verified: " . ($verifiedUser['is_verified'] ? 'Yes' : 'No') . "\n";
echo "  Token Cleared: " . (empty($verifiedUser['verification_token']) ? 'Yes' : 'No') . "\n";
echo "  Expiry Cleared: " . (empty($verifiedUser['verification_token_expires']) ? 'Yes' : 'No') . "\n\n";

if (!$verifiedUser['is_verified']) {
    echo "✗ User should be verified in database!\n";
    exit(1);
}

if (!empty($verifiedUser['verification_token'])) {
    echo "✗ Verification token should be cleared!\n";
    exit(1);
}

echo "✓ Database state is correct\n\n";

// Step 6: Login after verification
echo "Step 6: Login After Verification\n";
echo str_repeat('-', 50) . "\n";

$loginResult = auth()->login($testUsername, $testPassword);

if (!$loginResult['success']) {
    echo "✗ Login failed after verification!\n";
    echo "Errors: " . json_encode($loginResult['errors']) . "\n";
    exit(1);
}

echo "✓ Login successful!\n";
echo "  User ID: " . $loginResult['user']['id'] . "\n";
echo "  Username: " . $loginResult['user']['username'] . "\n";
echo "  Email: " . $loginResult['user']['email'] . "\n\n";

// Step 7: Test resend verification (should fail - already verified)
echo "Step 7: Test Resend Verification (Should Fail)\n";
echo str_repeat('-', 50) . "\n";

$resendResult = auth()->resendVerificationEmail($testEmail);

if ($resendResult['success']) {
    echo "✗ Resend should fail (already verified)!\n";
    exit(1);
}

echo "✓ Resend correctly prevented (already verified)\n";
echo "  Error: " . ($resendResult['errors']['email'] ?? 'Unknown') . "\n\n";

// Step 8: Test with invalid token
echo "Step 8: Test Invalid Token\n";
echo str_repeat('-', 50) . "\n";

$invalidToken = bin2hex(random_bytes(32));
$invalidResult = auth()->verifyEmail($invalidToken);

if ($invalidResult['success']) {
    echo "✗ Invalid token should not verify!\n";
    exit(1);
}

echo "✓ Invalid token correctly rejected\n";
echo "  Error: " . ($invalidResult['errors']['token'] ?? 'Unknown') . "\n\n";

// Cleanup
echo "Cleanup\n";
echo str_repeat('-', 50) . "\n";
db()->delete("DELETE FROM users WHERE id = ?", [$userId]);
echo "✓ Test user deleted\n\n";

// Summary
echo str_repeat('=', 50) . "\n";
echo "ALL TESTS PASSED ✓\n";
echo str_repeat('=', 50) . "\n";
echo "\nEmail Workflow Test Summary:\n";
echo "  1. Registration with email verification ✓\n";
echo "  2. Verification token generated ✓\n";
if (EMAIL_VERIFICATION_REQUIRED) {
    echo "  3. Login prevented before verification ✓\n";
}
echo "  4. Email verification successful ✓\n";
echo "  5. Database state updated correctly ✓\n";
echo "  6. Login allowed after verification ✓\n";
echo "  7. Resend prevented for verified users ✓\n";
echo "  8. Invalid tokens rejected ✓\n";
echo "\nConfiguration:\n";
echo "  EMAIL_ENABLED: " . (EMAIL_ENABLED ? 'true' : 'false') . "\n";
echo "  EMAIL_DEV_MODE: " . (EMAIL_DEV_MODE ? 'true' : 'false') . "\n";
echo "  EMAIL_VERIFICATION_REQUIRED: " . (EMAIL_VERIFICATION_REQUIRED ? 'true' : 'false') . "\n";
echo "  EMAIL_VERIFICATION_EXPIRY: " . EMAIL_VERIFICATION_EXPIRY . " seconds\n";

if (EMAIL_DEV_MODE) {
    echo "\nNote: Emails are logged to logs/emails.log in development mode.\n";
}

echo "\nWorkflow test completed successfully!\n";
