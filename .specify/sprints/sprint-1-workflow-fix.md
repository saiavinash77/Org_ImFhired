# Sprint 1 — End-to-End Workflow Fix

## Goal
Every step of the candidate + recruiter journey must work without friction.

## Complete Flow Map

### Candidate Journey (7 Steps)
1. Register → Login → Onboarding ✅
2. Upload resume (AI parses it) ✅
3. Browse jobs → Apply ✅
4. See application on dashboard with current STATUS ❌ (missing!)
5. Get invited → Schedule interview ⚠️ (invite sends but no visibility)
6. Take AI interview ✅
7. See scorecard after interview ✅

### Recruiter Journey (6 Steps)
1. Post job ✅
2. See applicants with resumes ✅ (just fixed)
3. View AI score + verification score ⚠️ (shows "Not verified" always)
4. Change candidate status (invite/shortlist/reject) ⚠️ (button exists, effect unclear)
5. View interview scorecard → specific candidate ❌ (links to list, not the candidate)
6. Make hiring decision → send offer ❌ (not built)

## Tasks (Ordered by Dependency)

### Task 1 — Candidate Dashboard: Show My Applications
- Add "My Applications" section to candidate dashboard
- Show: job title, status, when applied, action button
- Status must reflect real DB value (applied → invited → scheduled → interviewed)

### Task 2 — Recruiter Status Update: Make it Actually Work
- "Invite" button → updates DB status to "invited" + shows toast
- Add "Shortlist" and "Reject" buttons that actually update application status
- After update: candidate sees new status on their dashboard

### Task 3 — Recruiter Assessments: Link to Specific Candidate
- "View Report" button on candidates page → link to /recruiter/assessments?candidate_id=X
- Assessments page: filter by application_id when param is present

### Task 4 — Fix Verification Score Display
- Verification score comes from assessment or verification table
- Show actual score in recruiter candidates table (not always "Not verified")

### Task 5 — Recruiter: Add Shortlist/Reject/Offer Actions
- Add action dropdown in candidates table with: Shortlist, Invite, Reject, Make Offer
- Each calls PATCH /api/v1/applications/{id} with new status
