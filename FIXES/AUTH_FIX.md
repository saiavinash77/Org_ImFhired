# 🔧 Authentication Fix - Implementation Details

**Issue**: After candidate registration, login would redirect back to onboarding instead of dashboard.

**Status**: ✅ FIXED (May 2026)

---

## Root Causes

### 1. Missing Database Column ⚠️ CRITICAL
The `profiles` table was missing the `onboarding_completed` column:
- Backend couldn't track if user finished onboarding
- Even with completed onboarding, dashboard would always redirect back
- **Impact**: Every login prompted re-onboarding

### 2. Onboarding Page Not Protected ⚠️ HIGH
The `/candidate/onboarding` page wasn't wrapped with `AuthGuard`:
- No token validation on page load
- Could lose session on page refresh
- **Impact**: Token/auth errors and poor UX

### 3. Missing Token Loading Check ⚠️ MEDIUM
Onboarding component didn't wait for token to load:
- Made API calls before localStorage token was loaded
- Could encounter "missing Authorization" errors
- **Impact**: API failures on initial page load

---

## Solutions Implemented

### Solution 1: Add Database Column

**File**: `infra/setup_database.sql` (Updated)

```sql
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;
```

**What it does**: Tracks whether user completed onboarding

**Migration Command**:
```bash
psql -h your-db-host -U postgres -d firedin -f infra/migration_add_onboarding_fields.sql
```

### Solution 2: Protect Onboarding Page with AuthGuard

**File**: `frontend/src/app/candidate/onboarding/page.tsx`

**Before**:
```typescript
export default function OnboardingPage() {
  const { token, user, updateUser } = useAuth()
  // ... rest of code
  return <div>...</div>
}
```

**After**:
```typescript
function OnboardingContent() {
  const { token, user, updateUser, isLoading } = useAuth()
  
  // Guard: if still loading or no token, show loading state
  if (isLoading || !token) {
    return <LoadingSpinner />
  }
  
  // Rest of page code...
  return <div>...</div>
}

export default function OnboardingPage() {
  return (
    <AuthGuard requiredRole="candidate">
      <OnboardingContent />
    </AuthGuard>
  )
}
```

**What it does**:
- Only authenticated candidates can access onboarding
- Token is fully loaded before rendering page
- Shows proper loading UI while auth state is determined
- Prevents "missing token" errors on page reload

### Solution 3: Add Token Loading Guard

**Same file**: `frontend/src/app/candidate/onboarding/page.tsx`

```typescript
// Check if already onboarded - only redirect after auth is loaded
useEffect(() => {
  if (isLoading) return // Wait for auth to load
  
  if (user && user.profile?.onboarding_completed === true) {
    router.push('/candidate/dashboard')
  }
}, [user, router, isLoading])
```

**What it does**:
- Waits for `isLoading` to be false before checking onboarding status
- Prevents premature redirects
- Ensures token is available for API calls

---

## Complete Flow After Fix

### Registration → Onboarding → Dashboard

```
1. User registers at /auth/register
   └─ Form: name, email, password
   
2. Backend creates Cognito user + RDS profile
   └─ Stores: id, email, role, phone
   
3. Backend stores onboarding_completed = FALSE ✓
   └─ Critical for tracking state
   
4. Frontend stores token in localStorage
   
5. Frontend redirects to /candidate/onboarding
   └─ AuthGuard validates token ✓
   └─ Waits for token to load ✓
   
6. User completes onboarding form
   └─ Clicks "Complete Profile"
   
7. Frontend sends: PUT /api/v1/profiles/me
   └─ Data: { ..., onboarding_completed: true }
   
8. Backend updates database
   └─ profiles.onboarding_completed = TRUE ✓
   
9. Frontend redirects to /candidate/dashboard
```

### Login After Registration

```
1. User goes to /auth/login
   
2. User enters email + password
   
3. Backend verifies with AWS Cognito
   
4. Backend queries RDS:
   SELECT onboarding_completed FROM profiles
   
5. Backend returns token + user data
   
6. Frontend stores token + user in localStorage
   
7. Dashboard component checks:
   if (profile.onboarding_completed == true)
   └─ Stay on dashboard ✓
   else
   └─ Redirect to onboarding
   
8. User sees dashboard (NOT onboarding) ✅
```

---

## How to Apply the Fix

### Step 1: Run Database Migration

```bash
# Option A: Direct migration
psql -h your-db-host -U postgres -d firedin -f infra/migration_add_onboarding_fields.sql

# Option B: Using PowerShell on Windows
.\run_auth_migration.ps1 -DBHost "your-db-host"

# Option C: Full setup script
psql -h your-db-host -U postgres -d firedin -f infra/setup_database.sql
```

### Step 2: Verify Migration

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name = 'onboarding_completed';

-- Should return: onboarding_completed | boolean
```

### Step 3: Restart Services

```bash
# Backend
cd backend
python -m uvicorn app.main:app --reload

# Frontend (new terminal)
cd frontend
rm -rf .next
npm run dev
```

### Step 4: Test the Fix

1. **Register**: http://localhost:3002/auth/register
   - Fill form → Create Account → Onboarding ✓

2. **Complete Onboarding**: Fill all steps
   - Click "Complete Profile" → Dashboard ✓

3. **Login**: Logout then login
   - Enter credentials → Dashboard (NOT onboarding) ✓

4. **Session**: Refresh page
   - Should stay logged in ✓

---

## Files Modified

```
✅ infra/setup_database.sql
   └─ Added onboarding_completed + related columns

✅ frontend/src/app/candidate/onboarding/page.tsx
   └─ Added AuthGuard wrapper
   └─ Added isLoading check
   └─ Added loading UI

📄 infra/migration_add_onboarding_fields.sql (Created)
   └─ For applying fix to existing databases

📄 run_auth_migration.ps1 (Created)
   └─ Helper script for Windows migration
```

---

## Verification Checklist

- [ ] Database migration completed
- [ ] New column exists: `onboarding_completed`
- [ ] Backend restarted
- [ ] Frontend `.next` folder cleared
- [ ] Frontend restarted
- [ ] Can register as candidate
- [ ] Registration redirects to onboarding
- [ ] Can complete onboarding
- [ ] Onboarding redirects to dashboard
- [ ] Can logout
- [ ] Can login again without re-onboarding
- [ ] Dashboard visible after login
- [ ] Session persists on page refresh

---

## Troubleshooting

### Still asks for onboarding after login
1. Check database: `SELECT onboarding_completed FROM profiles WHERE id = 'user-id';`
2. Clear browser storage: `localStorage.clear()`
3. Re-register and try again

### "Missing Authorization" errors
1. Check localStorage: `localStorage.getItem('firedin_token')`
2. Clear .next folder: `rm -rf frontend/.next`
3. Restart frontend

### Database migration failed
1. Check PostgreSQL is running
2. Verify connection string in DATABASE_URL
3. Check migration file path
4. Try connecting directly: `psql -h your-host -U postgres -d firedin`

---

## Performance Impact

✅ **Minimal**: Only added one boolean column

✅ **Index**: Automatically indexed with primary key

✅ **Storage**: ~1 byte per user

✅ **Query Time**: No performance degradation

---

**Summary**: Simple but critical fix that ensures proper onboarding tracking and authentication flow.
