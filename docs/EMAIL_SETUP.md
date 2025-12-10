# Email Setup Guide

This guide explains how to configure email functionality for the Schach Chess Game application. The email system is designed to work both in local development (WAMP64) and production environments (Netcup/Plesk hosting).

## Table of Contents
- [Overview](#overview)
- [Local Development (WAMP64)](#local-development-wamp64)
- [Production Setup (Netcup/Plesk)](#production-setup-netcupplesk)
- [Configuration Options](#configuration-options)
- [Testing Email Functionality](#testing-email-functionality)
- [Troubleshooting](#troubleshooting)

---

## Overview

The email system supports:
- **Email verification** for new user registrations
- **Welcome emails** after successful verification
- **Flexible configuration** for development and production environments
- **Multiple sending methods**: PHP mail(), SMTP, or development mode (logs only)

---

## Local Development (WAMP64)

For local development, the email system runs in **development mode** by default, which logs emails to a file instead of actually sending them.

### Configuration

In `includes/config.php`, use these settings for local development:

```php
// Email configuration
define('EMAIL_ENABLED', true);           // Enable email system
define('EMAIL_DEV_MODE', true);          // Log emails instead of sending
define('EMAIL_FROM_ADDRESS', 'noreply@schach.local');
define('EMAIL_FROM_NAME', 'Schach Chess Game');

// SMTP Configuration (not needed in dev mode)
define('EMAIL_USE_SMTP', false);
```

### How It Works

1. When a user registers, the system generates a verification email
2. Instead of sending it, the email is logged to `logs/emails.log`
3. The email content (HTML and plain text) is saved for inspection
4. You can view the verification link in the log file and use it for testing

### Viewing Logged Emails

Email logs are stored in: `/logs/emails.log`

Example log entry:
```
================================================================================
EMAIL (Development Mode)
================================================================================
To: user@example.com
Subject: Verify Your Email Address - Schach - Chess Game
Time: 2024-12-10 12:30:45
--------------------------------------------------------------------------------
HTML Body:
[Full HTML email content with verification link]
================================================================================
```

### Testing Without SMTP

1. Register a new account through the web interface
2. Check `logs/emails.log` for the verification link
3. Copy the verification URL and paste it into your browser
4. The account will be verified

### Optional: Disable Email Verification Entirely

If you want to skip email verification for local development:

```php
define('EMAIL_VERIFICATION_REQUIRED', false);  // Skip verification
```

With this setting, users are automatically verified upon registration.

---

## Production Setup (Netcup/Plesk)

For production hosting with Netcup or other Plesk-based providers, you'll use SMTP to send emails.

### Step 1: Get SMTP Credentials from Plesk

1. **Log into your Plesk control panel**
   - URL: Usually `https://yourdomain.com:8443` or provided by Netcup
   - Use your Netcup credentials

2. **Navigate to Mail Settings**
   - Go to "Mail" in the left sidebar
   - Select your domain
   - Click "Mail Settings" or "Email Accounts"

3. **Create or Use Existing Email Account**
   - Create a new email account (e.g., `noreply@yourdomain.com`)
   - Or use an existing one
   - Note down the password

4. **Get SMTP Server Details**
   - SMTP Server: Usually `mail.yourdomain.com` or `smtp.yourdomain.com`
   - SMTP Port: 
     - `587` for TLS (recommended)
     - `465` for SSL
     - `25` for non-encrypted (not recommended)
   - Encryption: `TLS` or `SSL/TLS`

### Step 2: Configure Plesk for Outgoing Mail

1. **Check Outgoing Mail Settings**
   - In Plesk, go to "Tools & Settings"
   - Navigate to "Mail Server Settings"
   - Ensure outgoing mail is enabled
   - Verify that your server hostname is correctly set

2. **Configure SPF Record** (Optional but recommended)
   - Go to "DNS Settings" for your domain
   - Add or verify SPF record:
     ```
     v=spf1 mx a ip4:YOUR_SERVER_IP ~all
     ```
   - Replace `YOUR_SERVER_IP` with your server's IP address

3. **Configure DKIM** (Optional but recommended for better deliverability)
   - In Plesk, go to "Mail Settings"
   - Enable DKIM for your domain
   - Copy the DKIM DNS record
   - Add it to your DNS settings

### Step 3: Update Application Configuration

In `includes/config.php`, update these settings for production:

```php
// Email configuration
define('EMAIL_ENABLED', true);                // Enable email system
define('EMAIL_DEV_MODE', false);              // Actually send emails
define('EMAIL_FROM_ADDRESS', 'noreply@yourdomain.com');
define('EMAIL_FROM_NAME', 'Schach Chess Game');

// SMTP Configuration
define('EMAIL_USE_SMTP', true);               // Use SMTP
define('EMAIL_SMTP_HOST', 'mail.yourdomain.com');
define('EMAIL_SMTP_PORT', 587);               // 587 for TLS
define('EMAIL_SMTP_USER', 'noreply@yourdomain.com');
define('EMAIL_SMTP_PASS', 'your_email_password');
define('EMAIL_SMTP_SECURE', 'tls');           // 'tls' or 'ssl'

// Email verification
define('EMAIL_VERIFICATION_REQUIRED', true);  // Require email verification
define('EMAIL_VERIFICATION_EXPIRY', 86400);   // 24 hours
```

### Step 4: Update Site URL

Make sure your `SITE_URL` is set correctly for production:

```php
define('SITE_URL', 'https://yourdomain.com');
```

This is important because verification links use this URL.

### Step 5: Test Email Sending

After configuration:

1. Register a test account
2. Check that you receive the verification email
3. Click the verification link
4. Verify the account is activated

---

## Configuration Options

### Email Settings

| Setting | Description | Default |
|---------|-------------|---------|
| `EMAIL_ENABLED` | Enable/disable email system | `true` |
| `EMAIL_DEV_MODE` | Log emails instead of sending | `true` (dev), `false` (prod) |
| `EMAIL_FROM_ADDRESS` | Sender email address | `noreply@schach.local` |
| `EMAIL_FROM_NAME` | Sender display name | `Schach Chess Game` |

### SMTP Settings

| Setting | Description | Default |
|---------|-------------|---------|
| `EMAIL_USE_SMTP` | Use SMTP instead of PHP mail() | `false` |
| `EMAIL_SMTP_HOST` | SMTP server hostname | `smtp.example.com` |
| `EMAIL_SMTP_PORT` | SMTP port (587/465/25) | `587` |
| `EMAIL_SMTP_USER` | SMTP username | `''` |
| `EMAIL_SMTP_PASS` | SMTP password | `''` |
| `EMAIL_SMTP_SECURE` | Encryption type (tls/ssl) | `tls` |

### Verification Settings

| Setting | Description | Default |
|---------|-------------|---------|
| `EMAIL_VERIFICATION_REQUIRED` | Require email verification | `true` |
| `EMAIL_VERIFICATION_EXPIRY` | Token expiry in seconds | `86400` (24h) |

---

## Testing Email Functionality

### 1. Test Registration Flow

```bash
# Register a new user
POST /php/auth/register.php
{
  "username": "testuser",
  "email": "test@example.com",
  "password": "Test1234",
  "confirm_password": "Test1234"
}

# Expected response:
{
  "success": true,
  "message": "Registration successful! Please check your email to verify your account.",
  "requires_verification": true
}
```

### 2. Test Email Verification

```bash
# Verify email with token
GET /php/auth/verify-email.php?token=<verification_token>

# Expected response:
{
  "success": true,
  "message": "Email verified successfully! You can now log in.",
  "username": "testuser"
}
```

### 3. Test Resend Verification

```bash
# Resend verification email
POST /php/auth/resend-verification.php
{
  "email": "test@example.com"
}

# Expected response:
{
  "success": true,
  "message": "Verification email sent! Please check your inbox."
}
```

---

## Troubleshooting

### Issue: Emails Not Being Sent

**Symptoms**: No emails received, no error messages

**Solutions**:
1. Check that `EMAIL_ENABLED` is `true`
2. Verify `EMAIL_DEV_MODE` is `false` in production
3. Check server error logs for SMTP errors
4. Verify SMTP credentials are correct

### Issue: SMTP Authentication Failed

**Symptoms**: Error in logs about authentication failure

**Solutions**:
1. Double-check SMTP username and password
2. Ensure the email account exists in Plesk
3. Try using the full email address as username
4. Check if your hosting requires app-specific passwords

### Issue: Connection Timeout

**Symptoms**: Long delays, timeout errors

**Solutions**:
1. Verify SMTP port is correct (587 for TLS)
2. Check firewall rules allow outgoing connections
3. Try different ports (465 for SSL, 25 for plain)
4. Contact Netcup support to verify SMTP is enabled

### Issue: Emails Go to Spam

**Symptoms**: Emails received but in spam folder

**Solutions**:
1. Configure SPF record in DNS settings
2. Enable and configure DKIM in Plesk
3. Set up DMARC policy
4. Use a professional "from" address
5. Avoid spam trigger words in email content

### Issue: Verification Links Don't Work

**Symptoms**: 404 or invalid token errors

**Solutions**:
1. Verify `SITE_URL` is set correctly
2. Check that `.htaccess` is properly configured
3. Ensure `verify-email.html` exists in web root
4. Check that token hasn't expired (24 hours default)

### Issue: Can't See Logged Emails in Dev Mode

**Symptoms**: `logs/emails.log` not created or empty

**Solutions**:
1. Create `logs` directory manually: `mkdir logs`
2. Check directory permissions (must be writable)
3. Verify `EMAIL_DEV_MODE` is `true`
4. Check PHP error logs for permission issues

### Debugging Tips

1. **Enable Debug Mode**
   ```php
   define('DEBUG_MODE', true);
   ```

2. **Check PHP Error Log**
   - Location varies by server configuration
   - Often in `/var/log/apache2/error.log` or similar

3. **Test SMTP Connection Manually**
   ```bash
   telnet mail.yourdomain.com 587
   ```

4. **Check Email Logs**
   - Development: `logs/emails.log`
   - Production: PHP error log

---

## Alternative: Using Third-Party Email Services

For better deliverability, you might want to use services like:

- **SendGrid**
- **Mailgun**
- **Amazon SES**
- **SMTP2GO**

### Example: SendGrid Configuration

```php
define('EMAIL_USE_SMTP', true);
define('EMAIL_SMTP_HOST', 'smtp.sendgrid.net');
define('EMAIL_SMTP_PORT', 587);
define('EMAIL_SMTP_USER', 'apikey');
define('EMAIL_SMTP_PASS', 'YOUR_SENDGRID_API_KEY');
define('EMAIL_SMTP_SECURE', 'tls');
```

---

## Database Migration

If you're upgrading from a version without email verification, run this migration:

```sql
-- Add verification_token_expires column
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS verification_token_expires DATETIME DEFAULT NULL 
AFTER verification_token;

-- Add index for better performance
ALTER TABLE users 
ADD INDEX IF NOT EXISTS idx_verification_token (verification_token);
```

Or use the migration file: `sql/migrations/001_add_verification_token_expires.sql`

---

## Security Best Practices

1. **Never commit SMTP credentials to version control**
   - Use environment variables in production
   - Keep `config.php` out of git (add to `.gitignore`)

2. **Use TLS/SSL for SMTP**
   - Always use port 587 (TLS) or 465 (SSL)
   - Never use port 25 without encryption

3. **Set appropriate token expiry**
   - Default 24 hours is reasonable
   - Shorter for high-security applications

4. **Rate limit email sending**
   - Prevent abuse of resend verification feature
   - Consider adding rate limiting to registration

5. **Validate email addresses**
   - The system already does basic validation
   - Consider using email verification services for additional checks

---

## Support

For additional help:
- Check the main [README.md](../README.md)
- Review code comments in `includes/email.php`
- Contact Netcup support for hosting-specific issues

---

*Last updated: December 2024*
