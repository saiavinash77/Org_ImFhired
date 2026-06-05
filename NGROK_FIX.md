# ngrok + Profile Persistence Fixes

## Issues Fixed

### 1. "Failed to fetch" Error
**Cause:** CORS headers not allowing ngrok URLs

**Fix:** Updated `backend/app/main.py` to allow ngrok domains in development mode
- Uses regex pattern to allow `*.ngrok.io` URLs
- Only applies in development environment
- Production remains strict with `ALLOWED_ORIGINS`

### 2. "Duplicate key value violates unique constraint" Error
**Cause:** Using email as `cognito_sub` instead of Cognito's actual UUID

**Fix:** Updated `backend/app/api/v1/endpoints/auth_clean.py` to extract real Cognito sub
- Register: Extracts `sub` from Cognito response
- Login: Decodes ID token to get actual Cognito `sub` (UUID)
- Falls back to email if extraction fails

## What Changed

### Backend Files Modified

#### 1. `backend/app/main.py`
```python
# Now allows ngrok URLs in development
if settings.APP_ENV == "development":
    app.add_middleware(
        CORSMiddleware,
        allow_origin_regex=r"https?://(localhost|127\.0\.0\.1|.*\.ngrok\.io)(:\d+)?",
        ...
    )
else:
    # Production: strict CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_ORIGINS,
        ...
    )
```

#### 2. `backend/app/api/v1/endpoints/auth_clean.py`
```python
# Register: Extract real Cognito sub
cognito_response = await asyncio.to_thread(lambda: cognito.admin_create_user(**kwargs))
cognito_sub = cognito_response.get("User", {}).get("Username", data.email)

# Login: Decode ID token to get Cognito sub
id_token = auth_response.get("AuthenticationResult", {}).get("IdToken", "")
if id_token:
    id_token_payload = jwt.decode(id_token, options={"verify_signature": False})
    cognito_sub = id_token_payload.get("sub", data.email)
```

## Testing with ngrok

### Step 1: Start ngrok
```bash
ngrok http 3002  # Frontend
ngrok http 8002  # Backend
```

### Step 2: Update Frontend .env
```
NEXT_PUBLIC_API_URL=https://your-ngrok-backend-url.ngrok.io
```

### Step 3: Test Login
1. Go to ngrok frontend URL
2. Register new user
3. Should NOT get "Duplicate key" error
4. Should NOT get "Failed to fetch" error
5. Should redirect to onboarding or dashboard

### Step 4: Verify cognito_sub
```bash
psql -h <RDS_ENDPOINT> -U <DB_USER> -d <DB_NAME> -c "
SELECT email, cognito_sub FROM users LIMIT 5;
"
```

You should see UUIDs in `cognito_sub`, not emails.

## Troubleshooting

### Still getting "Failed to fetch"
1. Check backend logs for CORS errors
2. Verify ngrok URL matches the pattern: `https://*.ngrok.io`
3. Make sure `APP_ENV=development` in backend `.env`
4. Restart backend after changing `.env`

### Still getting "Duplicate key" error
1. Check if old users have duplicate `cognito_sub` values
2. Run this to see duplicates:
```sql
SELECT cognito_sub, COUNT(*) FROM users GROUP BY cognito_sub HAVING COUNT(*) > 1;
```
3. If found, manually fix them:
```sql
UPDATE users SET cognito_sub = NULL WHERE cognito_sub = 'email@example.com';
```

### Getting "Invalid token" on login
1. Make sure JWT decoding doesn't fail
2. Check backend logs for JWT decode errors
3. Verify Cognito is returning valid ID tokens

## Production Deployment

When deploying to production:
1. Set `APP_ENV=production` in backend `.env`
2. CORS will use strict `ALLOWED_ORIGINS` only
3. No ngrok URLs will be allowed
4. Add your production frontend URL to `ALLOWED_ORIGINS` in config.py

## Files to Deploy

- `backend/app/main.py` (CORS changes)
- `backend/app/api/v1/endpoints/auth_clean.py` (cognito_sub extraction)
- `backend/app/core/config.py` (ngrok comment added)

No database migration needed for this fix.
