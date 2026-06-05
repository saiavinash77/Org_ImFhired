-- Migration: Add cognito_sub column to users table
-- This links Cognito authentication to RDS user records

ALTER TABLE users ADD COLUMN IF NOT EXISTS cognito_sub VARCHAR(255) UNIQUE;

-- Backfill cognito_sub from cognito_username for existing users
UPDATE users SET cognito_sub = cognito_username WHERE cognito_sub IS NULL AND cognito_username IS NOT NULL;

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS users_cognito_sub_idx ON users(cognito_sub);

-- Add NOT NULL constraint after backfill (optional, but recommended)
-- ALTER TABLE users ALTER COLUMN cognito_sub SET NOT NULL;
