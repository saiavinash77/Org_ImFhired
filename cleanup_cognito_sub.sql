-- Cleanup script: Remove users with email-based cognito_sub
-- This fixes the duplicate key constraint error

-- First, let's see what we're deleting
SELECT COUNT(*) as records_to_delete FROM users WHERE cognito_sub LIKE '%@%';

-- Delete the problematic records
DELETE FROM users WHERE cognito_sub LIKE '%@%';

-- Verify cleanup
SELECT COUNT(*) as remaining_users FROM users;
SELECT email, cognito_sub FROM users LIMIT 10;
