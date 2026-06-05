# FiredIn Platform — Master Plan

> Last updated: May 2026  
> Status: V1 Core MVP ✅ | V2 In Progress 🔄

---

## What We've Built (V1 — Complete)

```
✅ Candidate registers → uploads resume → applies to job → AI interview → scorecard
✅ Recruiter posts job → views applicants → accesses resumes → sees dashboard
✅ Admin monitors system → runs AI agents → views all data
✅ AI conducts interviews (Groq/Llama 3.3 70B)
✅ AI scores candidates with verification
✅ Vector-based JD↔Resume matching
✅ S3 resume storage + presigned URLs
✅ AWS RDS PostgreSQL + Redis cache
✅ Glassmorphism premium UI (Next.js 14)
✅ Email service built (delivery unverified)
✅ Job sharing to LinkedIn/WhatsApp/Gmail
```

---

## What's Broken Right Now (Fix Before V2)

| # | Issue | Impact | Effort |
|---|-------|--------|--------|
| 1 | Recruiter assessments → candidate scorecard not linked | High | Low |
| 2 | Candidate status doesn't update after recruiter action | High | Medium |
| 3 | Email delivery unverified (SMTP/SES config) | High | Low |
| 4 | Verification score shows "Not verified" for everyone | Medium | Low |
| 5 | Analytics charts may not render on first load | Low | Low |

---

## V2 — Make Recruiters Love It

| Feature | Why | User |
|---------|-----|------|
| Kanban pipeline view | Visually manage candidates by stage | Recruiter |
| Scorecard viewer in-app | No PDF downloads needed | Recruiter |
| Real-time status updates | Candidate knows what's happening | Candidate |
| Email notifications | Invite, reject, offer — automated | Both |
| Video interview recording | Evidence for decisions, playback | Recruiter |

---

## V3 — Turn It Into a Business

| Feature | Revenue Impact |
|---------|---------------|
| Team/multi-recruiter accounts | High |
| Subscription billing (Razorpay) | Direct |
| Custom interview questions per job | Medium |
| WhatsApp notifications (India!) | Very High |
| Naukri/Indeed job sync | Large TAM |

---

## V4 — Moat Features

| Feature | Why |
|---------|-----|
| AI interviewer improves per domain | Data flywheel |
| Candidate reputation score | Network effect |
| Mobile app (React Native) | Daily active users |
| Multi-language: Hindi, Telugu, Tamil | India-first |
| ATS integrations | Enterprise lock-in |
