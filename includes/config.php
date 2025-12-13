<?php
/**
 * Database Configuration
 * Chess Game - Schach
 */

// Database credentials
define('DB_HOST', 'localhost');
define('DB_NAME', 'schach');
define('DB_USER', 'root');
define('DB_PASS', ''); // Default WAMP password is empty

// Site configuration
define('SITE_URL', 'http://localhost/schach-rouge-like');
define('SITE_NAME', 'Schach - Chess Game');

// Session configuration
define('SESSION_LIFETIME', 86400 * 30); // 30 days

// Email configuration
define('EMAIL_ENABLED', true); // Set to false to completely disable emails
define('EMAIL_DEV_MODE', true); // Set to false in production to send emails via SMTP instead of logging to file
define('EMAIL_FROM_ADDRESS', 'noreply@schach.local');
define('EMAIL_FROM_NAME', 'Schach Chess Game');

// SMTP Configuration (for production with Netcup/Plesk or other providers)
define('EMAIL_USE_SMTP', false); // Set to true to use SMTP instead of mail()
define('EMAIL_SMTP_HOST', 'smtp.example.com'); // SMTP server hostname
define('EMAIL_SMTP_PORT', 587); // SMTP port (587 for TLS, 465 for SSL, 25 for non-encrypted)
define('EMAIL_SMTP_USER', ''); // SMTP username
define('EMAIL_SMTP_PASS', ''); // SMTP password
define('EMAIL_SMTP_SECURE', 'tls'); // 'tls', 'ssl', or '' for no encryption

// Email verification
define('EMAIL_VERIFICATION_REQUIRED', true); // Set to false to skip email verification
define('EMAIL_VERIFICATION_EXPIRY', 86400); // Token expiry time in seconds (24 hours)

// Error reporting (disable in production)
define('DEBUG_MODE', true);

if (DEBUG_MODE) {
    error_reporting(E_ALL);
    ini_set('display_errors', 1);
} else {
    error_reporting(0);
    ini_set('display_errors', 0);
}

// Timezone
date_default_timezone_set('Europe/Berlin');

// Start session if not started
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
