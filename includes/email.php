<?php
/**
 * Email Service Class
 * Chess Game - Schach
 * 
 * Provides reusable email functionality with support for:
 * - SMTP (production with Netcup/Plesk or other providers)
 * - Development mode (logs to console/file)
 */

require_once __DIR__ . '/config.php';

class EmailService {
    private static $instance = null;
    private $enabled;
    private $devMode;
    
    private function __construct() {
        $this->enabled = EMAIL_ENABLED;
        $this->devMode = EMAIL_DEV_MODE;
    }
    
    /**
     * Get singleton instance
     */
    public static function getInstance(): self {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    /**
     * Send an email
     * 
     * @param string $to Recipient email address
     * @param string $subject Email subject
     * @param string $htmlBody HTML content
     * @param string $plainBody Plain text content (optional)
     * @return bool Success status
     */
    public function send(string $to, string $subject, string $htmlBody, string $plainBody = ''): bool {
        if (!$this->enabled) {
            $this->log("Email system disabled. Would send to: $to, Subject: $subject");
            return true; // Return true to not break registration flow
        }
        
        if ($this->devMode) {
            return $this->sendDevMode($to, $subject, $htmlBody, $plainBody);
        }
        
        return $this->sendSMTP($to, $subject, $htmlBody, $plainBody);
    }
    
    /**
     * Send verification email
     */
    public function sendVerificationEmail(string $to, string $username, string $token): bool {
        $verificationUrl = SITE_URL . '/verify-email.html?token=' . urlencode($token);
        
        $htmlBody = $this->loadTemplate('verification', [
            'username' => htmlspecialchars($username),
            'verification_url' => htmlspecialchars($verificationUrl),
            'site_name' => SITE_NAME,
            'site_url' => SITE_URL
        ]);
        
        $plainBody = "Hello $username,\n\n"
            . "Thank you for registering at " . SITE_NAME . "!\n\n"
            . "Please verify your email address by clicking the link below:\n"
            . "$verificationUrl\n\n"
            . "If you did not create an account, please ignore this email.\n\n"
            . "Best regards,\n"
            . SITE_NAME . " Team";
        
        return $this->send(
            $to,
            'Verify Your Email Address - ' . SITE_NAME,
            $htmlBody,
            $plainBody
        );
    }
    
    /**
     * Send welcome email (after verification)
     */
    public function sendWelcomeEmail(string $to, string $username): bool {
        $htmlBody = $this->loadTemplate('welcome', [
            'username' => htmlspecialchars($username),
            'site_name' => SITE_NAME,
            'site_url' => SITE_URL
        ]);
        
        $plainBody = "Hello $username,\n\n"
            . "Welcome to " . SITE_NAME . "!\n\n"
            . "Your email has been verified and your account is now active.\n"
            . "You can now enjoy all features of our chess platform.\n\n"
            . "Start playing: " . SITE_URL . "\n\n"
            . "Best regards,\n"
            . SITE_NAME . " Team";
        
        return $this->send(
            $to,
            'Welcome to ' . SITE_NAME,
            $htmlBody,
            $plainBody
        );
    }
    
    /**
     * Send email using SMTP
     */
    private function sendSMTP(string $to, string $subject, string $htmlBody, string $plainBody): bool {
        try {
            // Create message boundary
            $boundary = md5(uniqid(time()));
            
            // Headers
            $headers = [
                'From: ' . EMAIL_FROM_NAME . ' <' . EMAIL_FROM_ADDRESS . '>',
                'Reply-To: ' . EMAIL_FROM_ADDRESS,
                'MIME-Version: 1.0',
                'Content-Type: multipart/alternative; boundary="' . $boundary . '"'
            ];
            
            // Build message body
            $message = '';
            
            // Plain text part
            if (!empty($plainBody)) {
                $message .= "--$boundary\r\n";
                $message .= "Content-Type: text/plain; charset=UTF-8\r\n";
                $message .= "Content-Transfer-Encoding: 7bit\r\n\r\n";
                $message .= $plainBody . "\r\n\r\n";
            }
            
            // HTML part
            $message .= "--$boundary\r\n";
            $message .= "Content-Type: text/html; charset=UTF-8\r\n";
            $message .= "Content-Transfer-Encoding: 7bit\r\n\r\n";
            $message .= $htmlBody . "\r\n\r\n";
            $message .= "--$boundary--";
            
            // Use SMTP if configured
            if (EMAIL_USE_SMTP) {
                return $this->sendViaSMTPSocket($to, $subject, $message, $headers);
            }
            
            // Fallback to PHP mail()
            return mail($to, $subject, $message, implode("\r\n", $headers));
            
        } catch (Exception $e) {
            $this->logError("SMTP Error: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Send email via SMTP socket connection
     */
    private function sendViaSMTPSocket(string $to, string $subject, string $message, array $headers): bool {
        try {
            // Connect to SMTP server
            $smtp = fsockopen(
                EMAIL_SMTP_HOST,
                EMAIL_SMTP_PORT,
                $errno,
                $errstr,
                30
            );
            
            if (!$smtp) {
                throw new Exception("Could not connect to SMTP server: $errstr ($errno)");
            }
            
            // Read server greeting
            $this->smtpRead($smtp);
            
            // Send EHLO
            $this->smtpWrite($smtp, 'EHLO ' . EMAIL_SMTP_HOST);
            $this->smtpRead($smtp);
            
            // Authenticate if credentials provided
            if (!empty(EMAIL_SMTP_USER) && !empty(EMAIL_SMTP_PASS)) {
                $this->smtpWrite($smtp, 'AUTH LOGIN');
                $this->smtpRead($smtp);
                
                $this->smtpWrite($smtp, base64_encode(EMAIL_SMTP_USER));
                $this->smtpRead($smtp);
                
                $this->smtpWrite($smtp, base64_encode(EMAIL_SMTP_PASS));
                $response = $this->smtpRead($smtp);
                
                if (strpos($response, '235') !== 0) {
                    throw new Exception("SMTP Authentication failed");
                }
            }
            
            // Send MAIL FROM
            $this->smtpWrite($smtp, 'MAIL FROM: <' . EMAIL_FROM_ADDRESS . '>');
            $this->smtpRead($smtp);
            
            // Send RCPT TO
            $this->smtpWrite($smtp, 'RCPT TO: <' . $to . '>');
            $this->smtpRead($smtp);
            
            // Send DATA
            $this->smtpWrite($smtp, 'DATA');
            $this->smtpRead($smtp);
            
            // Send headers and message
            $emailData = implode("\r\n", $headers) . "\r\n";
            $emailData .= "To: $to\r\n";
            $emailData .= "Subject: $subject\r\n";
            $emailData .= "\r\n" . $message . "\r\n.";
            
            $this->smtpWrite($smtp, $emailData);
            $this->smtpRead($smtp);
            
            // Send QUIT
            $this->smtpWrite($smtp, 'QUIT');
            
            fclose($smtp);
            
            $this->log("Email sent successfully to: $to");
            return true;
            
        } catch (Exception $e) {
            $this->logError("SMTP Socket Error: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Send email in development mode (log to file/console)
     */
    private function sendDevMode(string $to, string $subject, string $htmlBody, string $plainBody): bool {
        $logMessage = "\n" . str_repeat('=', 80) . "\n";
        $logMessage .= "EMAIL (Development Mode)\n";
        $logMessage .= str_repeat('=', 80) . "\n";
        $logMessage .= "To: $to\n";
        $logMessage .= "Subject: $subject\n";
        $logMessage .= "Time: " . date('Y-m-d H:i:s') . "\n";
        $logMessage .= str_repeat('-', 80) . "\n";
        $logMessage .= "HTML Body:\n";
        $logMessage .= $htmlBody . "\n";
        if (!empty($plainBody)) {
            $logMessage .= str_repeat('-', 80) . "\n";
            $logMessage .= "Plain Text Body:\n";
            $logMessage .= $plainBody . "\n";
        }
        $logMessage .= str_repeat('=', 80) . "\n";
        
        // Log to file
        $logFile = __DIR__ . '/../logs/emails.log';
        $logDir = dirname($logFile);
        
        if (!is_dir($logDir)) {
            mkdir($logDir, 0755, true);
        }
        
        file_put_contents($logFile, $logMessage, FILE_APPEND);
        
        // Also log to error log for visibility
        if (DEBUG_MODE) {
            error_log("DEV EMAIL: To=$to, Subject=$subject");
        }
        
        $this->log("Email logged to: $logFile");
        return true;
    }
    
    /**
     * Load email template
     */
    private function loadTemplate(string $templateName, array $vars = []): string {
        $templatePath = __DIR__ . '/../templates/email/' . $templateName . '.html';
        
        if (!file_exists($templatePath)) {
            // Return basic template if file doesn't exist
            return $this->getBasicTemplate($vars);
        }
        
        $template = file_get_contents($templatePath);
        
        // Replace variables
        foreach ($vars as $key => $value) {
            $template = str_replace('{{' . $key . '}}', $value, $template);
        }
        
        return $template;
    }
    
    /**
     * Get basic email template
     */
    private function getBasicTemplate(array $vars): string {
        $username = $vars['username'] ?? 'User';
        $content = $vars['content'] ?? '';
        $siteName = $vars['site_name'] ?? SITE_NAME;
        
        return <<<HTML
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>$siteName</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <tr>
                        <td style="padding: 40px 30px; text-align: center; background-color: #2c3e50; border-radius: 8px 8px 0 0;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px;">$siteName</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 40px 30px;">
                            $content
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 20px 30px; text-align: center; background-color: #f8f9fa; border-radius: 0 0 8px 8px;">
                            <p style="margin: 0; color: #6c757d; font-size: 14px;">© 2024 $siteName. All rights reserved.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
HTML;
    }
    
    /**
     * SMTP helper: write to socket
     */
    private function smtpWrite($smtp, string $data): void {
        fwrite($smtp, $data . "\r\n");
    }
    
    /**
     * SMTP helper: read from socket
     */
    private function smtpRead($smtp): string {
        $response = '';
        while ($line = fgets($smtp, 515)) {
            $response .= $line;
            if (substr($line, 3, 1) == ' ') {
                break;
            }
        }
        return $response;
    }
    
    /**
     * Log message
     */
    private function log(string $message): void {
        if (DEBUG_MODE) {
            error_log("[EmailService] $message");
        }
    }
    
    /**
     * Log error
     */
    private function logError(string $message): void {
        error_log("[EmailService ERROR] $message");
    }
    
    // Prevent cloning
    private function __clone() {}
    
    // Prevent unserialization
    public function __wakeup() {
        throw new Exception("Cannot unserialize singleton");
    }
}

/**
 * Helper function to get EmailService instance
 */
function emailService(): EmailService {
    return EmailService::getInstance();
}
