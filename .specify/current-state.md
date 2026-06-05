# FiredIn Platform — Current State Specification

## What's Been Built (As Of May 2026)

### 🔐 Auth System
- Email/password registration and login
- JWT tokens with role-based access (candidate / recruiter / admin)
- Onboarding flow for new users
- Auth guard protecting all routes
- Social login stub (disabled, returns error)

### 👤 Candidate Portal (`/candidate/*`)
| Page | Status | Notes |
|------|--------|-------|
| `/candidate/onboarding` | ✅ Working | Profile setup + resume upload |
| `/candidate/dashboard` | ✅ Working | Shows applications, status, scorecard links |
| `/candidate/jobs` | ✅ Working | Browse & apply to active jobs (no verification gate) |
| `/candidate/apply` | ✅ Working | Resume upload + cover letter submission |
| `/candidate/schedule` | ✅ Working | Schedule AI interview |
| `/candidate/room/[id]` | ✅ Working | AI interview room (text + voice) |
| `/candidate/scorecard` | ✅ Working | Post-interview scorecard display |
| `/candidate/verify` | ⚠️ Exists | Verification flow (gate removed, page still exists) |

### 🏢 Recruiter Portal (`/recruiter/*`)
| Page | Status | Notes |
|------|--------|-------|
| `/recruiter` (dashboard) | ✅ Fixed | Stats, recent apps, upcoming interviews |
| `/recruiter/jobs` | ✅ Working | List, post, delete jobs. Share to LinkedIn/WhatsApp |
| `/recruiter/jobs/new` | ✅ Working | AI JD generator + job posting form |
| `/recruiter/candidates` | ✅ Fixed | Lists all applicants, filter by job_id, resume access |
| `/recruiter/assessments` | ⚠️ Partial | Shows interviews but linking to scorecard is broken |
| `/recruiter/analytics` | ⚠️ Partial | Funnel + weekly chart renders but data may be stale |
| `/recruiter/settings` | ⚠️ Unknown | Profile/company settings — not verified |

### 🛡️ Admin Portal (`/admin/*`)
| Page | Status | Notes |
|------|--------|-------|
| `/admin/dashboard` | ✅ Working | System metrics, multi-agent AI panel |
| Admin agents | ✅ Working | Groq-powered agents (Orchestrator, Analyst, Monitor, Ops) |

### 🔧 Backend Services
| Service | Status | Notes |
|---------|--------|-------|
| `resume_parser.py` | ✅ Working | LLM-based resume parsing on upload |
| `ai_interviewer.py` | ✅ Working | Conducts AI interview via chat |
| `assessment_generator.py` | ✅ Working | Generates scorecard after interview |
| `matching_engine.py` | ✅ Working | Vector-based JD ↔ resume matching |
| `verification.py` | ✅ Working | Skills verification (gate removed from UI) |
| `email_service.py` | ⚠️ Unknown | Email templates built, delivery not verified |
| `admin_agents.py` | ✅ Working | Multi-agent admin system |
| `s3_utils.py` | ✅ Working | S3 presigned URL generation |

### 🗄️ Database Schema (PostgreSQL)
Tables confirmed active:
- `users` — auth, role
- `profiles` — full_name, resume_url, skills, headline, parsed_data
- `jobs` — title, description, requirements, recruiter_id, embedding
- `applications` — candidate_id, job_id, status, ai_score, resume_url, parsed_data
- `interviews` — application_id, scheduled_at, status
- `assessments` — interview_id, scorecard JSON
- `notifications` — user_id, message, read status

---

## What's Broken / Incomplete Right Now

### 🔴 Critical
1. **Recruiter assessments page** — clicking "Report" links to `/recruiter/assessments` but doesn't filter to the specific candidate's scorecard
2. **Email delivery** — email_service.py exists but SMTP/SES config unverified
3. **Candidate status not updating** — after recruiter shortlists/rejects, candidate doesn't see updated status in real-time

### 🟡 Partially Working
4. **Scheduling system** — `/candidate/schedule` exists but calendar UX unclear
5. **Recruiter invite flow** — "Invite" button sends API call but email delivery unconfirmed
6. **Analytics page** — funnel data correct but charts may not render on first load
7. **Verification score** — verification endpoint works but score display in recruiter view shows "Not verified" for everyone

### ⚪ Not Built Yet
8. **Candidate ↔ Recruiter messaging**
9. **Video interview recording + playback**
10. **Custom interview questions per job**
11. **Offer letter generation**
12. **Public candidate profiles**
13. **Team/multi-recruiter accounts**
14. **Mobile app**

---

## Architecture Overview
```
Browser (Next.js 14)
    ↓ JWT auth headers
FastAPI (port 8002)
    ↓ asyncpg
PostgreSQL (AWS RDS)
    ↓
Redis (cache/sessions)
    ↓
AWS S3 (resume/recording storage)
    ↓
Groq API (LLM: Llama 3.3 70B) ← AI interview, parsing, scoring, agents
```
