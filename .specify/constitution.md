# FiredIn Platform — Project Constitution

## Mission
Build the **#1 AI-native hiring platform in India** that completely replaces traditional ATS systems.
Candidates get a fair, fast, AI-driven interview experience. Recruiters get ranked, verified, interview-ready candidates — automatically.

---

## Product Vision
FiredIn (brand name) is an end-to-end AI hiring platform with three portals:
- **Candidate Portal** — Apply, interview via AI, get scored
- **Recruiter Portal** — Post jobs, see ranked applicants, manage pipeline
- **Admin Portal** — Monitor system, run AI agents, view all data

The platform should feel like a **premium SaaS product** — not a side project.

---

## Tech Stack (Non-Negotiable)
| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), TypeScript, Vanilla CSS (glassmorphism design) |
| Backend | FastAPI (Python), asyncpg (PostgreSQL), Redis |
| AI / LLM | Groq API (Llama 3.3 70B) |
| Storage | AWS S3 (resumes, recordings) |
| Database | PostgreSQL (AWS RDS) |
| Auth | JWT-based custom auth (email/password) |
| Deployment | AWS (backend), Vercel or AWS (frontend) |

---

## Design Principles
1. **Premium-first UI** — Glassmorphism, smooth animations, dark/light ready
2. **Mobile responsive** — Every page must work on mobile
3. **AI-native** — AI is not a bolt-on; it IS the product
4. **Real data only** — No mock data, no placeholders in production flows
5. **Fast & reliable** — Pages load under 2s, API responses under 500ms

---

## Code Quality Rules
1. **TypeScript strict** — No `any` unless absolutely unavoidable
2. **Error boundaries** — Every API call must handle errors gracefully
3. **No hardcoded secrets** — All config via environment variables
4. **JSON parsing safety** — Always safely parse API responses, never assume type
5. **Consistent naming** — camelCase frontend, snake_case backend
6. **No dead code** — Remove unused files, endpoints, components

---

## Feature Priorities (MoSCoW)
### Must Have (Core MVP — DONE)
- [x] Candidate registration + onboarding
- [x] Resume upload + AI parsing
- [x] Job board for candidates
- [x] Application submission
- [x] AI-conducted text/video interview (room)
- [x] Interview scorecard generation
- [x] Recruiter job posting
- [x] Recruiter candidate list with resume access
- [x] Recruiter dashboard with stats
- [x] Admin dashboard

### Should Have (V2 — IN PROGRESS / BROKEN)
- [ ] Real-time recruiter notifications when someone applies
- [ ] Candidate pipeline status tracking (visual Kanban)
- [ ] Email notifications (invite, rejection, offer)
- [ ] Interview scheduling system
- [ ] Analytics & hiring metrics (funnel, weekly activity)
- [ ] AI assistant chat for recruiters

### Could Have (V3 — NOT BUILT)
- [ ] LinkedIn-style candidate profiles (public)
- [ ] Video interview recording + playback
- [ ] Multi-recruiter / team accounts
- [ ] Custom interview question sets per job
- [ ] Candidate messaging system
- [ ] Mobile app (React Native)
- [ ] AI job description generator (partially done)
- [ ] Automated offer letter generation
- [ ] ATS export (CSV done, Naukri/Indeed integration pending)

### Won't Have (Out of Scope for Now)
- Social login (disabled)
- Multi-language support
- White-label mode

---

## Known Bugs & Issues (Current State)
1. **Recruiter candidates page shows 0** — FIXED (asyncpg JSON string bug)
2. **Job filtering used job_title instead of job_id** — FIXED
3. **Resume upload 400 errors** — FIXED (Content-Type header)
4. **Dashboard shows empty** — FIXED (JSON parse + optional chaining)
5. **ChunkLoadError on hot reload** — FIXED (clear .next cache)
6. **Verification gate blocking applications** — REMOVED

---

## Agent Rules (for AI Coding Agents)
- Always read the full file before editing
- Never assume JSON types from asyncpg — always parse safely
- Use `job_id` (UUID) for filtering, never `job_title` (string)
- Always restart backend after Python changes
- Clear `.next` cache before restarting frontend after major changes
- Check browser console AND backend logs when debugging
- Test with real data — never add mock/fake data to production flows
