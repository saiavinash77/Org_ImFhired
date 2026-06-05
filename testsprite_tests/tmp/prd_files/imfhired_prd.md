# FiredIn — Product Requirements Document

## Overview
FiredIn is an AI-powered hiring platform for experienced professionals who were laid off or want to switch jobs. It is NOT a job board — it is a verification + matching platform.

## Core Concept
Candidates complete a one-time AI verification interview based on their resume. They get a Verified badge with a score. Recruiters see this score when candidates apply. No second interview — the verification score IS the signal.

## User Roles
1. **Candidate** — job seeker (laid off or switching)
2. **Recruiter** — hiring manager posting jobs

## Candidate Flow
1. Register at /auth/register (role=candidate)
2. Complete 8-step onboarding wizard at /candidate/onboarding
3. Complete one-time verification interview at /candidate/verify/{id}
4. Get Verified badge with score (0-100)
5. Browse jobs at /candidate/jobs (blocked if not verified)
6. Apply for jobs
7. Wait for recruiter invite
8. Schedule interview slot at /candidate/schedule
9. Attend scheduled meeting

## Recruiter Flow
1. Register at /auth/register (role=recruiter)
2. Post jobs at /recruiter/jobs/new
3. View applicants with verification scores at /recruiter/candidates
4. Click Invite on candidates with good scores
5. Candidate schedules → recruiter sees in dashboard
6. Send offer via /recruiter/assessments

## Key Features
- Verification interview: AI asks resume-based questions, generates 0-100 score
- Verification gate: unverified candidates cannot apply for jobs
- Recruiter candidates page shows verification score + Verified badge
- Notification bell with real-time unread count
- Schedule page: time slot picker, no AI interview room
- Auth: register, login, forgot password (2-step with code)
- Role separation: same email cannot register as both candidate and recruiter

## Tech Stack
- Frontend: Next.js 14, TypeScript, Tailwind CSS
- Backend: FastAPI Python, AWS RDS PostgreSQL, AWS Cognito, AWS S3
- AI: Groq Whisper (STT), Groq LLaMA (interviewer + scoring)
- Email: Resend SMTP
