# Backend Cleanup & Restart Guide

## Issue
The old auth code was storing email addresses as `cognito_sub` instead of the actual Cognito UUID. This causes duplicate key constraint errors on login.

## Solution

### Step 1: Stop the Backend
If the backend is running, stop it (Ctrl+C in the terminal).

### Step 2: Clean Up Old Records
Connect to your PostgreSQL database and run this SQL:

```sql
-- Remove users with email-based cognito_sub (old records)
DELETE FROM users WHERE cognito_sub LIKE '%@%';
```

**How to run it:**
```bash
# Using psql
psql -h <your-db-host> -U <your-db-user> -d <your-db-name> -c "DELETE FROM users WHERE cognito_sub LIKE '%@%';"

# Or connect interactively and paste the SQL
psql -h <your-db-host> -U <your-db-user> -d <your-db-name>
# Then paste the DELETE statement above
```

### Step 3: Restart the Backend
```bash
cd backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8002
```

### Step 4: Test
- Try registering a new user via ngrok
- Try logging in
- Both should now work without "Failed to fetch" or duplicate key errors

## What Changed
- **CORS**: Now allows all `*.ngrok.io` domains in development
- **Cognito Sub Extraction**: 
  - Register: Extracts real Cognito UUID from response
  - Login: Decodes ID token to get actual Cognito `sub`
  - Falls back to email if extraction fails

## Verification
After restart, check the database:
```sql
SELECT email, cognito_sub FROM users LIMIT 5;
```

You should see UUIDs like `41b3ddda-7001-70c8-0fa9-9078ba6caeb1`, not email addresses.
