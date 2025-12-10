<?php
/**
 * Authentication Functions
 * Chess Game - Schach
 */

require_once __DIR__ . '/database.php';
require_once __DIR__ . '/email.php';

class Auth {
    private $db;
    
    public function __construct() {
        $this->db = Database::getInstance();
    }
    
    /**
     * Register a new user
     */
    public function register(string $username, string $email, string $password): array {
        // Validate input
        $errors = $this->validateRegistration($username, $email, $password);
        if (!empty($errors)) {
            return ['success' => false, 'errors' => $errors];
        }
        
        // Check if username exists
        $existing = $this->db->fetchOne(
            "SELECT id FROM users WHERE username = ?",
            [$username]
        );
        if ($existing) {
            return ['success' => false, 'errors' => ['username' => 'Username already taken']];
        }
        
        // Check if email exists
        $existing = $this->db->fetchOne(
            "SELECT id FROM users WHERE email = ?",
            [$email]
        );
        if ($existing) {
            return ['success' => false, 'errors' => ['email' => 'Email already registered']];
        }
        
        // Hash password
        $passwordHash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
        
        // Generate verification token
        $verificationToken = bin2hex(random_bytes(32));
        $verificationExpiry = date('Y-m-d H:i:s', time() + EMAIL_VERIFICATION_EXPIRY);
        
        // Determine if user should be verified immediately
        $isVerified = !EMAIL_VERIFICATION_REQUIRED ? 1 : 0;
        
        try {
            $this->db->beginTransaction();
            
            // Insert user
            $userId = $this->db->insert(
                "INSERT INTO users (username, email, password_hash, verification_token, verification_token_expires, is_verified) 
                 VALUES (?, ?, ?, ?, ?, ?)",
                [$username, $email, $passwordHash, $verificationToken, $verificationExpiry, $isVerified]
            );
            
            // Create user stats
            $this->db->insert(
                "INSERT INTO user_stats (user_id) VALUES (?)",
                [$userId]
            );
            
            $this->db->commit();
            
            // Send verification email if required
            if (EMAIL_VERIFICATION_REQUIRED) {
                emailService()->sendVerificationEmail($email, $username, $verificationToken);
            }
            
            return [
                'success' => true,
                'user_id' => $userId,
                'message' => EMAIL_VERIFICATION_REQUIRED 
                    ? 'Registration successful! Please check your email to verify your account.' 
                    : 'Registration successful!',
                'requires_verification' => EMAIL_VERIFICATION_REQUIRED
            ];
            
        } catch (Exception $e) {
            $this->db->rollback();
            return ['success' => false, 'errors' => ['general' => 'Registration failed. Please try again.']];
        }
    }
    
    /**
     * Validate registration input
     */
    private function validateRegistration(string $username, string $email, string $password): array {
        $errors = [];
        
        // Username validation
        if (strlen($username) < 3) {
            $errors['username'] = 'Username must be at least 3 characters';
        } elseif (strlen($username) > 20) {
            $errors['username'] = 'Username must be less than 20 characters';
        } elseif (!preg_match('/^[a-zA-Z0-9_]+$/', $username)) {
            $errors['username'] = 'Username can only contain letters, numbers, and underscores';
        }
        
        // Email validation
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $errors['email'] = 'Please enter a valid email address';
        }
        
        // Password validation
        if (strlen($password) < 8) {
            $errors['password'] = 'Password must be at least 8 characters';
        } elseif (!preg_match('/[A-Z]/', $password)) {
            $errors['password'] = 'Password must contain at least one uppercase letter';
        } elseif (!preg_match('/[a-z]/', $password)) {
            $errors['password'] = 'Password must contain at least one lowercase letter';
        } elseif (!preg_match('/[0-9]/', $password)) {
            $errors['password'] = 'Password must contain at least one number';
        }
        
        return $errors;
    }
    
    /**
     * Login a user
     */
    public function login(string $identifier, string $password, bool $rememberMe = false): array {
        // Find user by username or email
        $user = $this->db->fetchOne(
            "SELECT * FROM users WHERE username = ? OR email = ?",
            [$identifier, $identifier]
        );
        
        if (!$user) {
            return ['success' => false, 'errors' => ['general' => 'Invalid username or password']];
        }
        
        // Check if account is active
        if (!$user['is_active']) {
            return ['success' => false, 'errors' => ['general' => 'Your account has been suspended']];
        }
        
        // Check if email is verified (if verification is required)
        if (EMAIL_VERIFICATION_REQUIRED && !$user['is_verified']) {
            return [
                'success' => false, 
                'errors' => ['general' => 'Please verify your email address before logging in. Check your inbox for the verification link.'],
                'requires_verification' => true,
                'email' => $user['email']
            ];
        }
        
        // Verify password
        if (!password_verify($password, $user['password_hash'])) {
            return ['success' => false, 'errors' => ['general' => 'Invalid username or password']];
        }
        
        // Update last login
        $this->db->update(
            "UPDATE users SET last_login = NOW() WHERE id = ?",
            [$user['id']]
        );
        
        // Set session
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['username'] = $user['username'];
        $_SESSION['is_admin'] = $user['is_admin'];
        
        // Create persistent session if remember me
        if ($rememberMe) {
            $this->createPersistentSession($user['id']);
        }
        
        return [
            'success' => true,
            'user' => [
                'id' => $user['id'],
                'username' => $user['username'],
                'email' => $user['email'],
                'avatar' => $user['avatar'],
                'elo_rating' => $user['elo_rating']
            ]
        ];
    }
    
    /**
     * Create persistent session (remember me)
     */
    private function createPersistentSession(int $userId): void {
        $token = bin2hex(random_bytes(32));
        $expires = date('Y-m-d H:i:s', time() + SESSION_LIFETIME);
        
        // Store in database
        $this->db->insert(
            "INSERT INTO sessions (user_id, session_token, ip_address, user_agent, expires_at) 
             VALUES (?, ?, ?, ?, ?)",
            [
                $userId,
                $token,
                $_SERVER['REMOTE_ADDR'] ?? null,
                $_SERVER['HTTP_USER_AGENT'] ?? null,
                $expires
            ]
        );
        
        // Set cookie
        setcookie(
            'remember_token',
            $token,
            time() + SESSION_LIFETIME,
            '/',
            '',
            false, // secure (set to true in production with HTTPS)
            true   // httponly
        );
    }
    
    /**
     * Check if user is logged in
     */
    public function isLoggedIn(): bool {
        if (isset($_SESSION['user_id'])) {
            return true;
        }
        
        // Check for persistent session
        if (isset($_COOKIE['remember_token'])) {
            return $this->loginFromToken($_COOKIE['remember_token']);
        }
        
        return false;
    }
    
    /**
     * Login from remember me token
     */
    private function loginFromToken(string $token): bool {
        $session = $this->db->fetchOne(
            "SELECT s.*, u.username, u.is_admin 
             FROM sessions s 
             JOIN users u ON s.user_id = u.id 
             WHERE s.session_token = ? AND s.expires_at > NOW() AND u.is_active = 1",
            [$token]
        );
        
        if ($session) {
            $_SESSION['user_id'] = $session['user_id'];
            $_SESSION['username'] = $session['username'];
            $_SESSION['is_admin'] = $session['is_admin'];
            
            // Update last login
            $this->db->update(
                "UPDATE users SET last_login = NOW() WHERE id = ?",
                [$session['user_id']]
            );
            
            return true;
        }
        
        // Invalid token, clear cookie
        setcookie('remember_token', '', time() - 3600, '/');
        return false;
    }
    
    /**
     * Get current user
     */
    public function getCurrentUser(): ?array {
        if (!$this->isLoggedIn()) {
            return null;
        }
        
        $user = $this->db->fetchOne(
            "SELECT u.*, us.games_played, us.games_won, us.games_lost, us.games_drawn 
             FROM users u 
             LEFT JOIN user_stats us ON u.id = us.user_id 
             WHERE u.id = ?",
            [$_SESSION['user_id']]
        );
        
        if ($user) {
            // Don't expose sensitive data
            unset($user['password_hash']);
            unset($user['verification_token']);
            unset($user['reset_token']);
            unset($user['reset_token_expires']);
        }
        
        return $user;
    }
    
    /**
     * Logout user
     */
    public function logout(): void {
        // Delete persistent session
        if (isset($_COOKIE['remember_token'])) {
            $this->db->delete(
                "DELETE FROM sessions WHERE session_token = ?",
                [$_COOKIE['remember_token']]
            );
            setcookie('remember_token', '', time() - 3600, '/');
        }
        
        // Destroy session
        $_SESSION = [];
        if (ini_get("session.use_cookies")) {
            $params = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000,
                $params["path"], $params["domain"],
                $params["secure"], $params["httponly"]
            );
        }
        session_destroy();
    }
    
    /**
     * Update user profile
     */
    public function updateProfile(int $userId, array $data): array {
        $updates = [];
        $params = [];
        
        // Update email if provided
        if (isset($data['email']) && !empty($data['email'])) {
            if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
                return ['success' => false, 'errors' => ['email' => 'Invalid email address']];
            }
            
            // Check if email is taken by another user
            $existing = $this->db->fetchOne(
                "SELECT id FROM users WHERE email = ? AND id != ?",
                [$data['email'], $userId]
            );
            if ($existing) {
                return ['success' => false, 'errors' => ['email' => 'Email already in use']];
            }
            
            $updates[] = "email = ?";
            $params[] = $data['email'];
        }
        
        // Update avatar if provided
        if (isset($data['avatar'])) {
            $updates[] = "avatar = ?";
            $params[] = $data['avatar'];
        }
        
        if (empty($updates)) {
            return ['success' => false, 'errors' => ['general' => 'No changes to update']];
        }
        
        $params[] = $userId;
        $this->db->update(
            "UPDATE users SET " . implode(', ', $updates) . " WHERE id = ?",
            $params
        );
        
        return ['success' => true, 'message' => 'Profile updated successfully'];
    }
    
    /**
     * Change password
     */
    public function changePassword(int $userId, string $currentPassword, string $newPassword): array {
        // Get current password hash
        $user = $this->db->fetchOne(
            "SELECT password_hash FROM users WHERE id = ?",
            [$userId]
        );
        
        if (!$user || !password_verify($currentPassword, $user['password_hash'])) {
            return ['success' => false, 'errors' => ['current_password' => 'Current password is incorrect']];
        }
        
        // Validate new password
        if (strlen($newPassword) < 8) {
            return ['success' => false, 'errors' => ['new_password' => 'Password must be at least 8 characters']];
        }
        
        // Update password
        $newHash = password_hash($newPassword, PASSWORD_BCRYPT, ['cost' => 12]);
        $this->db->update(
            "UPDATE users SET password_hash = ? WHERE id = ?",
            [$newHash, $userId]
        );
        
        return ['success' => true, 'message' => 'Password changed successfully'];
    }
    
    /**
     * Get user by ID
     */
    public function getUserById(int $userId): ?array {
        $user = $this->db->fetchOne(
            "SELECT u.id, u.username, u.avatar, u.elo_rating, u.created_at, u.last_login,
                    us.games_played, us.games_won, us.games_lost, us.games_drawn,
                    us.longest_win_streak, us.current_win_streak
             FROM users u
             LEFT JOIN user_stats us ON u.id = us.user_id
             WHERE u.id = ? AND u.is_active = 1",
            [$userId]
        );
        
        return $user;
    }
    
    /**
     * Delete user account
     */
    public function deleteAccount(int $userId, string $password): array {
        // Verify password
        $user = $this->db->fetchOne(
            "SELECT password_hash FROM users WHERE id = ?",
            [$userId]
        );
        
        if (!$user || !password_verify($password, $user['password_hash'])) {
            return ['success' => false, 'errors' => ['password' => 'Password is incorrect']];
        }
        
        // Delete user (cascades to related tables)
        $this->db->delete("DELETE FROM users WHERE id = ?", [$userId]);
        
        // Logout
        $this->logout();
        
        return ['success' => true, 'message' => 'Account deleted successfully'];
    }
    
    /**
     * Verify email with token
     */
    public function verifyEmail(string $token): array {
        // Find user with valid token
        $user = $this->db->fetchOne(
            "SELECT id, username, email, is_verified, verification_token_expires 
             FROM users 
             WHERE verification_token = ? AND is_active = 1",
            [$token]
        );
        
        if (!$user) {
            return ['success' => false, 'errors' => ['token' => 'Invalid verification token']];
        }
        
        // Check if already verified
        if ($user['is_verified']) {
            return ['success' => false, 'errors' => ['token' => 'Email already verified']];
        }
        
        // Check if token expired
        // Note: Both MySQL datetime and PHP time() use the server timezone set in config.php
        if ($user['verification_token_expires'] && strtotime($user['verification_token_expires']) < time()) {
            return ['success' => false, 'errors' => ['token' => 'Verification token has expired. Please request a new one.']];
        }
        
        // Update user as verified
        $this->db->update(
            "UPDATE users SET is_verified = 1, verification_token = NULL, verification_token_expires = NULL WHERE id = ?",
            [$user['id']]
        );
        
        // Send welcome email
        emailService()->sendWelcomeEmail($user['email'], $user['username']);
        
        return [
            'success' => true,
            'message' => 'Email verified successfully! You can now log in.',
            'username' => $user['username']
        ];
    }
    
    /**
     * Resend verification email
     */
    public function resendVerificationEmail(string $email): array {
        // Find user by email
        $user = $this->db->fetchOne(
            "SELECT id, username, email, is_verified 
             FROM users 
             WHERE email = ? AND is_active = 1",
            [$email]
        );
        
        if (!$user) {
            return ['success' => false, 'errors' => ['email' => 'Email not found']];
        }
        
        // Check if already verified
        if ($user['is_verified']) {
            return ['success' => false, 'errors' => ['email' => 'Email already verified']];
        }
        
        // Generate new token
        $verificationToken = bin2hex(random_bytes(32));
        $verificationExpiry = date('Y-m-d H:i:s', time() + EMAIL_VERIFICATION_EXPIRY);
        
        // Update user with new token
        $this->db->update(
            "UPDATE users SET verification_token = ?, verification_token_expires = ? WHERE id = ?",
            [$verificationToken, $verificationExpiry, $user['id']]
        );
        
        // Send verification email
        emailService()->sendVerificationEmail($user['email'], $user['username'], $verificationToken);
        
        return [
            'success' => true,
            'message' => 'Verification email sent! Please check your inbox.'
        ];
    }
}

/**
 * Helper function to get Auth instance
 */
function auth(): Auth {
    static $auth = null;
    if ($auth === null) {
        $auth = new Auth();
    }
    return $auth;
}
