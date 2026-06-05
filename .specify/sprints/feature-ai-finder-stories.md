# Feature Spec: AI Candidate Finder + Stories of Work

**Version:** 1.0  
**Priority:** V2 — Build after workflow stabilization  
**Status:** Specced, ready for implementation planning

---

## Feature 1: AI Candidate Finder

### What It Is
A natural language search bar on the Recruiter portal where recruiters 
describe the candidate they want in plain English. The AI finds and 
ranks matching candidates from everyone on the platform.

### User Story
> "As a recruiter, I want to describe my ideal candidate in my own 
> words and instantly see ranked matches — without manually filtering 
> skills, experience, or location."

### Exact Flow

```
1. Recruiter opens "Find Candidates" page (or sidebar in Candidates tab)

2. They see a large text input:
   "Describe your ideal candidate..."
   
3. They type something like:
   "Senior data scientist with ML experience, knows Python and TensorFlow,
    5+ years, preferably worked in fintech or healthcare, remote-friendly"

4. They click "Find Match" (or press Enter)

5. AI processes the query:
   - Understands: role = data scientist, seniority = senior, 
     skills = Python + TensorFlow, domain = fintech/healthcare
   - Generates a vector embedding of this query
   - Compares against all candidate profile embeddings in DB
   - Also scans their Stories of Work for recency signal

6. Returns ranked results:
   ┌──────────────────────────────────────────┐
   │ 94% Match  │ Ravi K. │ 6yr ML Eng       │
   │ Skills: Python ✓ TF ✓ Fintech ✓ Remote ✓│
   │ [View Profile] [Resume] [Stories]        │
   ├──────────────────────────────────────────┤
   │ 81% Match  │ Priya S. │ 4yr Data Sci    │
   │ Skills: Python ✓ TF ✓ Healthcare ✓      │
   │ [View Profile] [Resume] [Stories]        │
   └──────────────────────────────────────────┘

7. Recruiter clicks → full profile modal or page
8. Recruiter can: Save candidate, Invite to apply, Contact
```

### Success Criteria
- [ ] Query processes in < 3 seconds
- [ ] Returns min 1 result if any candidate exists in system
- [ ] Scores are meaningful (not all 90%+)
- [ ] Works with vague queries ("good developer who is fast learner")
- [ ] Works with specific queries ("React + TypeScript + 3yr + Hyderabad")

### Technical Design

**Backend:**
- New endpoint: `POST /api/v1/search/candidates`
- Body: `{ "query": "...", "limit": 20 }`
- Steps:
  1. Send query to Groq to extract structured intent 
     (role, skills, years, location, domain)
  2. Generate embedding of the query using existing embedding model
  3. Vector similarity search against `profiles.embedding` column
  4. Also full-text search against `profiles.parsed_data` (skills, summary)
  5. Combine scores: vector_score * 0.6 + skill_overlap * 0.4
  6. Return ranked list with match percentage

**Frontend:**
- New page: `/recruiter/search` OR inline in `/recruiter/candidates`
- Large search input at top
- Results appear as cards below
- Each card: avatar, name, match %, top 3 skills, experience, actions
- Loading state with "AI is finding your matches..." message

**Database:**
- Add `embedding` column to `profiles` table (already may exist)
- Populate embedding when candidate uploads resume (already done via resume_parser)

---

## Feature 2: Stories of Work

### What It Is
A daily micro-blog for candidates where they write what they actually 
worked on. These stories are AI-indexed and create a real-time talent 
signal that recruiters can browse and get matched to their open roles.

### User Story (Candidate)
> "As a candidate, I want to share what I'm building and learning every 
> day — not fake LinkedIn posts — and have recruiters actually notice 
> me based on my real work."

### User Story (Recruiter)
> "As a recruiter, I want to discover talented candidates through what 
> they're actually doing at work, not just their static resume."

### Exact Flow

#### Candidate Posts a Story
```
1. Candidate sees "Post Today's Story" prompt on their dashboard
   (only one story per day — keeps it real, not spammy)

2. They type a short story (max 500 characters):
   "Built a microservices API using FastAPI and Redis today. 
    Solved a race condition in our async job queue. 
    Also reviewed architecture for a new ML pipeline."

3. They click "Post" → story goes live

4. AI automatically:
   - Tags it: #FastAPI #Redis #AsyncProgramming #MLPipeline #APIDesign
   - Generates a skill signal score for the story
   - Indexes it for search

5. Story appears on:
   - Candidate's public profile
   - Recruiter's "Stories Feed"
   - AI search results for relevant queries
```

#### Recruiter Browses Stories
```
1. Recruiter opens "Stories" tab (new in sidebar)

2. They see a feed of today's/recent work stories from all candidates:
   ┌─────────────────────────────────────────────────┐
   │ 🔥 91% Match to "Data Scientist" role            │
   │ Ravi K. • 2 hours ago                           │
   │ "Trained a classification model using XGBoost   │
   │  today, achieved 94% accuracy on test set.      │
   │  Also wrote unit tests for our data pipeline."  │
   │ Tags: #XGBoost #ML #Python #Testing             │
   │ [Save] [View Profile] [Invite to Apply]         │
   └─────────────────────────────────────────────────┘

3. AI highlights stories that match their OPEN JOBS
   (automatic, based on current active job postings)

4. Recruiter can:
   - Save a candidate to their pipeline
   - Invite candidate to apply for a specific job
   - View candidate's full story history
```

### Success Criteria
- [ ] Candidates can post 1 story per day
- [ ] Stories appear in recruiter feed within seconds
- [ ] AI tags are auto-generated and accurate
- [ ] Recruiter feed shows "% match to your open roles"
- [ ] Recruiter can invite candidate directly from story
- [ ] Stories are visible on candidate public profile
- [ ] Stories feed is paginated, loads fast

### Technical Design

**New Database Table: `stories`**
```sql
CREATE TABLE stories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID REFERENCES users(id),
    content TEXT NOT NULL,         -- raw story text (max 500 chars)
    ai_tags TEXT[],                -- auto-extracted skill tags
    embedding vector(1536),        -- for semantic search
    story_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(candidate_id, story_date)  -- one story per day per candidate
);
```

**Backend Endpoints:**
```
POST   /api/v1/stories/              → Candidate posts a story
GET    /api/v1/stories/me            → Candidate sees their own stories
GET    /api/v1/stories/feed          → Recruiter feed (with match scores)
GET    /api/v1/stories/{id}          → Single story detail
DELETE /api/v1/stories/{id}          → Candidate deletes their story
```

**AI Processing on Post:**
1. Call Groq to extract tags from story content
2. Generate embedding of story text
3. Store both in DB
4. Match against recruiter's active jobs (async, non-blocking)

**Frontend Pages:**
- Candidate dashboard: "Post your story for today" prompt card
- Candidate profile: "Work Stories" section showing last 30 stories
- Recruiter sidebar: new "Stories" nav item
- Recruiter stories page: feed with AI match scores to open roles

---

## Implementation Order

```
Phase 1: Database + Backend (2 days)
  → Create stories table + migration
  → POST /stories/ endpoint with AI tagging
  → GET /stories/feed endpoint with job matching
  → POST /search/candidates endpoint with vector search

Phase 2: Candidate UI (1 day)
  → Story composer on candidate dashboard
  → Story history on candidate profile

Phase 3: Recruiter UI (2 days)
  → Stories feed page with match scores
  → AI Candidate Finder search page
  → Invite/save actions from both

Phase 4: Polish (1 day)
  → Loading states, error handling
  → Real-time updates on story feed
  → Mobile responsive
```

---

## Open Questions (Boss Agent asking)

1. **Should stories be public to everyone or only visible after candidate opts in?**
2. **Can a recruiter see WHO posted a story before the candidate applies?** (Privacy concern)
3. **Should candidates have a "story streak" tracker to encourage daily posting?**
4. **Should the AI Finder also search candidates who haven't applied to any job yet?**
5. **Is there a word limit on stories? 280 chars (tweet-size) or 500 chars?**

Answer these and Phase 1 begins immediately.
