# HireAI — Project Status & Handoff Document

## AWS Credentials (stored in .env — never commit)

| Key | Value |
|-----|-------|
| AWS Account ID | 796174528269 |
| AWS Region | ap-south-1 |
| Access Key ID | see .env |
| Secret Access Key | see .env |

---

## AWS Resources — DONE ✅

### S3 Bucket
| Field | Value |
|-------|-------|
| Bucket Name | hireai-uploads-prod |
| Region | ap-south-1 |
| Public Access | Blocked |
| Encryption | AES256 |
| Status | ✅ Created & secured |

### Cognito User Pool
| Field | Value |
|-------|-------|
| Pool Name | hireai-users |
| User Pool ID | ap-south-1_4HxQTPfYM |
| App Client Name | My web app - 8ed3t9 |
| App Client ID | 58qrkntu9f1nnldcrttim9vcgf |
| App Client Secret | 6n0ni4hts2ck2kb612b77160t49dt81dam7l31akv2uaqeeurlf |
| Sign-in Method | Email |
| Auth Flows | SRP + Choice-based |
| Status | ✅ Created |

### RDS PostgreSQL
| Field | Value |
|-------|-------|
| DB Identifier | hireai-postgres |
| Endpoint | hireai-postgres.c54cc8uc8jru.ap-south-1.rds.amazonaws.com |
| Port | 5432 |
| Database Name | postgres |
| Master Username | hireai |
| Master Password | .!HQ#D;%2:AkSfg |
| Instance Class | db.t4g.micro |
| Engine | PostgreSQL 16 |
| Region/AZ | ap-south-1a |
| Security Group | sg-004561cca5f4e608a (default) |
| Inbound Rule | TCP 5432 from 0.0.0.0/0 ✅ |
| Status | ✅ Available — but connection timing out (see blocker below) |

---

## Current .env (backend)

> ⚠️ Never commit `.env` — it's in `.gitignore`. Copy `.env.example` and fill in your values.

```
DATABASE_URL=postgresql://hireai:<password>@hireai-postgres.c54cc8uc8jru.ap-south-1.rds.amazonaws.com:5432/postgres
COGNITO_USER_POOL_ID=ap-south-1_4HxQTPfYM
COGNITO_CLIENT_ID=58qrkntu9f1nnldcrttim9vcgf
COGNITO_CLIENT_SECRET=<see aws console>
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=<your key>
AWS_SECRET_ACCESS_KEY=<your secret>
AWS_S3_BUCKET=hireai-uploads-prod
RESEND_API_KEY=<your resend key>
GROQ_API_KEY=<your groq key>
SECRET_KEY=<generate random 64 chars>
FRONTEND_URL=http://localhost:3002
PORT=8002
```

---

## Current Blocker 🔴

**RDS connection is timing out.**

The security group inbound rule for port 5432 is set correctly (`0.0.0.0/0`), but the RDS instance has **"Public access: Disabled"** — this means it can't be reached from outside AWS even with the security group open.

### Fix (2 minutes in AWS Console):
1. Go to: https://console.aws.amazon.com/rds/home?region=ap-south-1
2. Click **Databases** → click **hireai-postgres**
3. Click **"Modify"** button (top right)
4. Scroll to **"Connectivity"** section
5. Under **"Public access"** → select **"Publicly accessible"**
6. Scroll to bottom → click **"Continue"**
7. Select **"Apply immediately"**
8. Click **"Modify DB instance"**
9. Wait 2-3 minutes for it to apply
10. Tell me when done — I'll test connection and run the schema

---

## Code Status

### Backend (FastAPI) — What's Built ✅
- `app/core/config.py` — all settings wired to .env
- `app/core/database.py` — asyncpg pool + Cognito client
- `app/api/v1/endpoints/auth.py` — register, login, logout, forgot password (Cognito + RDS)
- `app/api/v1/endpoints/verification.py` — candidate verification flow
- `app/api/v1/endpoints/realtime_proxy.py` — WebSocket interview room (OpenAI Realtime)
- `app/api/v1/endpoints/assessment.py` — scorecard fetch, regenerate, send offer
- `app/api/v1/endpoints/analytics.py` — dashboard + metrics
- `app/api/v1/endpoints/schedule.py` — interview scheduling
- `app/services/assessment_generator.py` — AI scoring engine (Groq/GPT)
- `app/services/ai_interviewer.py` — interview state machine
- `app/services/verification.py` — verification badge logic
- `app/services/resume_parser.py` — PDF/DOCX parsing
- `app/services/matching_engine.py` — semantic JD matching
- `app/services/email_service.py` — Resend email
- `app/services/s3_utils.py` — S3 upload/presigned URLs
- `infra/schema.sql` — full PostgreSQL schema ready to run

### Backend — What Needs Fixing ⚠️
- `jobs.py` — still uses `get_supabase()` → needs asyncpg migration
- `applications.py` — still uses `get_supabase()` → needs asyncpg migration
- `profiles.py` — still uses `get_supabase()` → needs asyncpg migration
- `analytics.py` — still uses `get_supabase()` → needs asyncpg migration
- `assessment.py` — still uses `get_supabase()` → needs asyncpg migration
- `resume_parser.py` — `_keyword_match_score` calls `get_supabase()`

### Frontend (Next.js) — What's Built ✅
- Landing page (`/`)
- Auth pages (`/auth/login`, `/auth/register`, `/auth/forgot-password`)
- Recruiter layout + sidebar
- Recruiter dashboard (`/recruiter`)
- Recruiter jobs (`/recruiter/jobs`, `/recruiter/jobs/new`, `/recruiter/jobs/[id]`)
- Recruiter candidates (`/recruiter/candidates`)
- Recruiter assessments list (`/recruiter/assessments`)
- Recruiter analytics (`/recruiter/analytics`)
- Recruiter settings (`/recruiter/settings`)
- Candidate dashboard (`/candidate/dashboard`) — resume upload + AI insights
- Candidate apply (`/candidate/apply`)
- Candidate jobs (`/candidate/jobs`)
- Candidate interview room (`/candidate/room/[interviewId]`)

### Frontend — What's Missing ⚠️
- `/candidate/verify/[id]` — verification interview room (onboarding gate)
- `/recruiter/assessments/[interviewId]` — full scorecard detail page
- `/candidate/scorecard` — candidate's own scorecard view
- `/candidate/schedule` — schedule interview page
- `recruiter/page.tsx` — imports `supabase` for realtime (needs removal)

---

## Remaining Steps (in order)

### Step 1 — Fix RDS Public Access (YOU do this)
See "Current Blocker" section above. Takes 2-3 minutes.

### Step 2 — Run Database Schema (I do this)
Once connected, run `infra/schema.sql` on RDS to create all tables:
- users, profiles, jobs, applications, interviews, assessments
- verification_interviews
- pgvector extension
- indexes + triggers

### Step 3 — Migrate Backend from Supabase → asyncpg (I do this)
Rewrite the 5 files listed above to use `get_pg_pool()` instead of `get_supabase()`.

### Step 4 — Test Backend Locally (we do together)
```
cd backend
uvicorn app.main:app --port 8002 --reload
```
Test: register a user, login, check Cognito + RDS both get the record.

### Step 5 — Build Missing Frontend Pages (I do this)
- Verification interview room
- Assessment scorecard detail
- Candidate scorecard
- Schedule page

### Step 6 — Test Full Flow (we do together)
1. Register as candidate → hits Cognito + RDS
2. Upload resume → parses + stores in RDS + S3
3. Start verification interview → WebSocket room
4. Complete interview → assessment generated
5. Apply for job → match score computed
6. Recruiter sees candidate + scorecard

### Step 7 — Deploy to AWS ECS (after everything works locally)
- Build Docker image
- Push to ECR
- Deploy via ECS Fargate
- Set up ALB

---

## Tech Stack Summary

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Backend | FastAPI, Python 3.11 |
| Database | AWS RDS PostgreSQL 16 + pgvector |
| Auth | AWS Cognito |
| Storage | AWS S3 |
| AI/LLM | Groq (llama/gpt-oss) + OpenAI Realtime API |
| Email | Resend |
| Cache | Redis (disabled locally, ElastiCache in prod) |
| Infra | AWS ECS Fargate + ALB |
| IaC | Terraform |
