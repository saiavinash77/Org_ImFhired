# Complete ngrok Setup Guide

## Problem
When using ngrok, the frontend gets "Failed to fetch" errors because it's trying to reach the backend at the wrong URL.

## Root Cause
- Frontend defaults to `http://{hostname}:8002`
- When accessing via ngrok (e.g., `https://abc123.ngrok.io`), it tries `http://abc123.ngrok.io:8002`
- ngrok doesn't forward port 8002 — it only forwards the configured port (usually 8000 or 8001)

## Solution

### Step 1: Get Your ngrok URL
When you start ngrok, it shows you the forwarding URL:
```
ngrok http 8002
# Output: Forwarding https://abc123.ngrok.io -> http://localhost:8002
```

Your ngrok URL is: `https://abc123.ngrok.io`

### Step 2: Set Frontend Environment Variable
Create or update `.env.local` in the frontend directory:

```bash
# frontend/.env.local
NEXT_PUBLIC_API_URL=https://abc123.ngrok.io
```

Replace `abc123` with your actual ngrok subdomain.

### Step 3: Restart Frontend Dev Server
```bash
cd frontend
npm run dev
# or
yarn dev
```

### Step 4: Test
1. Open the ngrok URL in your browser (e.g., `https://abc123.ngrok.io:3000`)
2. Try registering or logging in
3. Should work without "Failed to fetch" errors

## Backend Requirements
The backend CORS is already configured to allow ngrok URLs. Make sure:
1. Backend is running: `python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8002`
2. Database is clean (run cleanup if needed): `DELETE FROM users WHERE cognito_sub LIKE '%@%';`

## Troubleshooting

### Still getting "Failed to fetch"?
1. Check browser console (F12) for the actual error
2. Verify `NEXT_PUBLIC_API_URL` is set correctly
3. Make sure ngrok URL is HTTPS (not HTTP)
4. Restart the frontend dev server after changing .env.local

### Getting CORS errors?
- Backend CORS is configured for `*.ngrok.io` domains
- Make sure backend is restarted after code changes

### Getting database errors?
- Run the cleanup SQL: `DELETE FROM users WHERE cognito_sub LIKE '%@%';`
- Restart backend after cleanup
