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
define('SITE_URL', 'http://localhost/schach');
define('SITE_NAME', 'Schach - Chess Game');

// Session configuration
define('SESSION_LIFETIME', 86400 * 30); // 30 days

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
