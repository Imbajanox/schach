-- Migration: Add email verification token expiry
-- Run this on existing databases to add the new field

USE schach;

-- Add verification_token_expires column if it doesn't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS verification_token_expires DATETIME DEFAULT NULL AFTER verification_token;

-- Add index for verification_token if not exists
ALTER TABLE users 
ADD INDEX IF NOT EXISTS idx_verification_token (verification_token);
