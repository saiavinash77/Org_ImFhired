# HireAI — Project Discussion Log

## Session 1

### Project Vision
Building a hiring platform targeted at **experienced professionals and laid-off talent** who are forced to mass-apply like freshers on LinkedIn/Indeed with no differentiation.

**Core idea:** Add a verification layer so candidates aren't just a PDF in a pile. A verified candidate carries a trust signal that recruiters can rely on.

---

### Platform Structure

**Two sides, one system:**

**Recruiter Side (standard hiring workflow)**
- Post jobs
- View applicants, resumes, match scores
- See AI interview scorecards
- Send offers / reject candidates
- Reschedule interviews for candidates
- Analytics dashboard
- Team management

**Candidate Side (standard + verification layer)**
- Browse & apply for jobs
- Upload resume → AI parses & matches
- **Verification layer (onboarding):**
  - Candidate must complete an AI interview before applying
  - Interview is based on their resume (skills, experience)
  - Score generated → Verified badge on profile
  - Badge travels with every job application
  - If low score → can retake (previous verification badge NOT affected)
  - Unverified candidates cannot apply to jobs (hard gate)
- After verification → apply to jobs normally
- If recruiter wants → can reschedule a fresh AI interview (does NOT change verification badge)

---

### Decisions Made

| Topic | Decision |
|---|---|
| Database | AWS RDS PostgreSQL 16 (replaces Supabase) |
| Auth | AWS Cognito (replaces Supabase Auth) |
| Voice AI | TBD — moving away from OpenAI Realtime API, exploring AWS alternatives |
| Storage | AWS S3 (already in codebase) |
| Email | Resend SMTP (already in codebase) |
| Cache | AWS ElastiCache Redis |
| Infra | AWS ECS Fargate + ALB + Terraform |
| Frontend | Next.js 14 + TypeScript + Tailwind CSS |
| Backend | FastAPI Python 3.11 |

---

### Voice AI — OpenAI Realtime API Replacement

**Options being evaluated:**

1. **Amazon Transcribe + Amazon Polly + Bedrock (Claude)**
   - Transcribe: speech-to-text (STT)
   - Polly: text-to-speech (TTS)
   - Bedrock (Claude 3): interview logic / question generation
   - All AWS native — no OpenAI dependency
   - Slightly higher latency than OpenAI Realtime (~1-2s vs ~300ms)
   - ✅ Recommended if staying 100% AWS

2. **Deepgram (STT) + ElevenLabs (TTS) + Bedrock (Claude)**
   - Best audio quality
   - Not 100% AWS but very reliable
   - ❌ Adds external dependencies

3. **Keep OpenAI but only for non-realtime (GPT-4o for assessment, scoring)**
   - Use AWS Transcribe + Polly for the voice layer
   - Hybrid approach

**Decision pending from user.**

---

### AWS Resources Needed

| Resource | Purpose |
|---|---|
| RDS PostgreSQL 16 | Main database |
| Cognito User Pool | Authentication |
| S3 Bucket | Resume + file storage |
| ElastiCache Redis | Session cache |
| ECS Fargate | Backend hosting |
| ALB | Load balancer |
| SSM Parameter Store | Secrets management |
| SES or Resend | Email |
| Amazon Transcribe | STT for voice interviews (if AWS route) |
| Amazon Polly | TTS for voice interviews (if AWS route) |
| Amazon Bedrock | Claude 3 for interview AI (if AWS route) |

---

### Pending from User
- [ ] Confirm voice AI choice (AWS native vs hybrid)
- [ ] AWS credentials (Access Key ID + Secret Access Key)
- [ ] Confirm region (ap-south-1 assumed)
- [ ] Any other stack changes?

---

*Log updated as discussion progresses.*
