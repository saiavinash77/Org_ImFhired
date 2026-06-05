# Profile Persistence on Login — Complete Fix

## Problem
Every time a user logs in via Cognito, the app asks them to fill in their details again from scratch instead of loading their saved profile.

## Root Cause
1. No `cognito_sub` column in RDS to link Cognito users to profiles
2. No `/api/users/me` endpoint to check if profile exists
3. No session persistence across page refreshes
4. Frontend wasn't checking for existing profiles after login

## Solution Implemented

### Backend Changes

#### 1. Database Migration
**File:** `infra/migration_add_cognito_sub.sql`

Adds the `cognito_sub` column to the users table:
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS cognito_sub VARCHAR(255) UNIQUE;
CREATE INDEX IF NOT EXISTS users_cognito_sub_idx ON users(cognito_sub);
```

**Action Required:** Run this migration on your RDS instance:
```bash
psql -h <RDS_ENDPOINT> -U <DB_USER> -d <DB_NAME> -f infra/migration_add_cognito_sub.sql
```

#### 2. New Users Endpoint
**File:** `backend/app/api/v1/endpoints/users.py`

Creates the critical `/api/v1/users/me` endpoint that:
- Extracts Cognito `sub` from JWT token
- Queries RDS for user by `cognito_sub`
- Returns 200 with full profile if exists
- Returns 404 if user doesn't exist (brand new user)
- **Never** returns 200 with empty data

**Key Function:**
```python
@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    Get current user profile by Cognito sub from JWT token.
    Returns 200 with profile or 404 if not found.
    """
```

#### 3. Updated Auth Endpoints
**File:** `backend/app/api/v1/endpoints/auth_clean.py`

Modified register and login endpoints to:
- Store `cognito_sub` when creating new users
- Update `cognito_sub` for existing users on login
- Use email as `cognito_sub` (Cognito uses email as username)

#### 4. Updated Main App
**File:** `backend/app/main.py`

- Imported new `users` router
- Registered users router at `/api/v1/users`
- Removed old direct route mappings

### Frontend Changes

#### 1. Auth Persistence Hook
**File:** `frontend/src/hooks/useAuthPersistence.ts`

Provides utilities for:
- Checking for valid JWT token on app load
- Validating token with backend
- Hydrating user state from localStorage
- Clearing session on logout

#### 2. Auth Initializer Component
**File:** `frontend/src/components/AuthInitializer.tsx`

Runs on app load to:
- Check for valid JWT token
- Call `/api/users/me` to validate and restore user state
- Redirect authenticated users away from login page
- Show loading state while checking auth
- Prevent showing login page to already-authenticated users

#### 3. Updated Root Layout
**File:** `frontend/src/app/layout.tsx`

Wrapped app with `<AuthInitializer>` to ensure auth is checked before rendering any pages.

#### 4. Existing Login Flow
**File:** `frontend/src/app/auth/login/page.tsx` (already implemented)

Already has the correct flow:
1. User logs in via Cognito
2. Immediately calls `GET /api/users/me` with JWT
3. On 200 with complete profile → redirect to dashboard
4. On 404 → redirect to onboarding
5. On 200 with incomplete profile → redirect to onboarding?resume=true

## Login Flow (Complete)

### Step 1: User Logs In
```
User enters email/password → Cognito authenticates → Backend returns JWT
```

### Step 2: Extract Cognito Sub
```
JWT contains "sub" claim (Cognito user ID) → Frontend extracts it
```

### Step 3: Check Profile Existence
```
Frontend calls: GET /api/users/me with JWT
Backend:
  - Extracts sub from JWT
  - Queries: SELECT * FROM users WHERE cognito_sub = [sub]
  - If found: Returns 200 with full profile
  - If not found: Returns 404
```

### Step 4: Route Based on Response
```
200 + complete profile → Redirect to /dashboard/candidate or /dashboard/recruiter
404 → Redirect to /candidate/onboarding (brand new user)
200 + incomplete profile → Redirect to /candidate/onboarding?resume=true
```

### Step 5: Session Persistence
```
On page refresh:
  - AuthInitializer checks for JWT in localStorage
  - Calls GET /api/users/me to validate
  - If valid: Restores user state
  - If invalid: Clears session and shows login
```

## Testing Scenarios

### Scenario 1: Brand New User
1. User registers → Profile created with `onboarding_completed = false`
2. User logs out
3. User logs back in
4. Frontend calls `/api/users/me` → Returns 200 with incomplete profile
5. Frontend redirects to `/candidate/onboarding?resume=true`
6. ✅ User resumes from where they left off

### Scenario 2: Returning User with Complete Profile
1. User completes onboarding → `onboarding_completed = true`
2. User logs out
3. User logs back in
4. Frontend calls `/api/users/me` → Returns 200 with complete profile
5. Frontend redirects to `/dashboard/candidate`
6. ✅ User goes directly to dashboard, skips onboarding

### Scenario 3: Returning User with Incomplete Profile
1. User starts onboarding but doesn't finish
2. User logs out
3. User logs back in
4. Frontend calls `/api/users/me` → Returns 200 with incomplete profile
5. Frontend redirects to `/candidate/onboarding?resume=true`
6. ✅ User resumes from where they left off

### Scenario 4: Page Refresh While Logged In
1. User is logged in and on dashboard
2. User refreshes page
3. AuthInitializer checks for JWT in localStorage
4. Calls `/api/users/me` to validate
5. ✅ User state is restored, no redirect to login

## Console Logging

All steps are logged with `[Auth Flow]` prefix for debugging:

```
[Auth Flow] Login: Initiating login request for user@example.com...
[Auth Flow] Login: Cognito authentication success. Custom token received: eyJ...
[Auth Flow] Login: Making immediate GET /api/users/me request to sync user state...
[Auth Flow] Login: /api/users/me response status: 200
[Auth Flow] Login: Profile loaded. Role: candidate, Onboarding Completed: false
[Auth Flow] Login: Candidate profile is incomplete. Redirecting to onboarding with resume=true.
```

## Database Schema

### Users Table
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL,
    cognito_username TEXT,
    cognito_sub VARCHAR(255) UNIQUE,  -- NEW: Links Cognito to RDS
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);

CREATE INDEX users_cognito_sub_idx ON users(cognito_sub);
```

### Profiles Table
```sql
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES users(id),
    full_name TEXT,
    phone TEXT,
    ...
    onboarding_completed BOOLEAN DEFAULT FALSE,  -- Tracks completion status
    ...
);
```

## Deployment Checklist

- [ ] Run database migration to add `cognito_sub` column
- [ ] Deploy backend changes (users.py endpoint, auth_clean.py updates, main.py updates)
- [ ] Deploy frontend changes (AuthInitializer, layout.tsx, login page already has logic)
- [ ] Test all three scenarios above
- [ ] Monitor console logs for `[Auth Flow]` messages
- [ ] Verify no users are redirected to onboarding when they shouldn't be

## Files Modified/Created

### Backend
- ✅ `backend/app/api/v1/endpoints/users.py` (NEW)
- ✅ `backend/app/api/v1/endpoints/auth_clean.py` (MODIFIED)
- ✅ `backend/app/main.py` (MODIFIED)
- ✅ `infra/migration_add_cognito_sub.sql` (NEW)

### Frontend
- ✅ `frontend/src/components/AuthInitializer.tsx` (NEW)
- ✅ `frontend/src/hooks/useAuthPersistence.ts` (NEW)
- ✅ `frontend/src/app/layout.tsx` (MODIFIED)
- ✅ `frontend/src/app/auth/login/page.tsx` (Already correct)

## Troubleshooting

### Issue: User still sees onboarding after login
**Check:**
1. Is `cognito_sub` column in RDS? Run migration if not.
2. Are console logs showing `[Auth Flow]` messages?
3. Is `/api/users/me` returning 200 or 404?
4. Is `onboarding_completed` field set correctly in profiles table?

### Issue: Page refresh logs user out
**Check:**
1. Is JWT stored in localStorage?
2. Is AuthInitializer component rendering?
3. Is `/api/users/me` being called on app load?
4. Is token validation working?

### Issue: Recruiter sees onboarding instead of dashboard
**Check:**
1. Is user role set to 'recruiter' in database?
2. Is `/api/users/me` returning correct role?
3. Check console logs for role value

## Notes

- The `cognito_sub` is set to the user's email (Cognito uses email as username)
- Session is stored in localStorage with JWT token and user profile
- All auth checks happen before rendering any pages (AuthInitializer)
- Console logs with `[Auth Flow]` prefix help trace the entire flow
- No user with a complete profile will ever be redirected to onboarding
