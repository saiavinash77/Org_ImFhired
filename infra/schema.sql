-- ============================================================
-- HireAI — AWS RDS PostgreSQL Schema
-- Replaces Supabase entirely.
-- Run once on a fresh RDS instance.
-- ============================================================

-- Enable pgvector for semantic JD matching
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── USERS ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email           TEXT UNIQUE NOT NULL,
    role            TEXT NOT NULL CHECK (role IN ('recruiter', 'candidate', 'admin')),
    cognito_username TEXT,                    -- Cognito email/username
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── PROFILES ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
    id              UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    full_name       TEXT,
    phone           TEXT,
    avatar_url      TEXT,
    headline        TEXT,
    bio             TEXT,
    company_name    TEXT,
    company_website TEXT,
    skills          TEXT[]          DEFAULT '{}',
    experience_years FLOAT          DEFAULT 0,
    resume_url      TEXT,
    parsed_data     JSONB,

    -- ── Verification layer ────────────────────────────────────────────────────
    -- Tracks the candidate's onboarding verification interview state.
    -- verification_status: pending → resume_uploaded → interview_scheduled
    --                       → in_progress → completed | failed
    verification_status         TEXT DEFAULT 'pending',
    verification_score          FLOAT,           -- overall_score from verification interview
    verified_at                 TIMESTAMPTZ,     -- set when score >= threshold
    verification_interview_id   UUID,            -- FK to verification_interviews
    verification_assessment     JSONB,           -- full assessment JSON

    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── VERIFICATION INTERVIEWS ───────────────────────────────────────────────────
-- Separate from job interviews — these are the onboarding verification sessions.
-- One per candidate (upserted on retake).
CREATE TABLE IF NOT EXISTS verification_interviews (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id    UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    status          TEXT DEFAULT 'scheduled'
                        CHECK (status IN ('scheduled','in_progress','completed','cancelled')),
    unique_link     TEXT,
    transcript      JSONB,
    proctoring_logs JSONB,
    termination_reason TEXT DEFAULT 'completed',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    completed_at    TIMESTAMPTZ
);

-- ── JOBS ──────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS jobs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recruiter_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title           TEXT NOT NULL,
    description     TEXT,
    requirements    TEXT[]          DEFAULT '{}',
    department      TEXT            DEFAULT 'Engineering',
    location        TEXT            DEFAULT 'Remote',
    type            TEXT            DEFAULT 'full_time',
    salary_min      INTEGER         DEFAULT 0,
    salary_max      INTEGER         DEFAULT 0,
    experience_min  INTEGER         DEFAULT 0,
    experience_max  INTEGER,
    is_active       BOOLEAN         DEFAULT TRUE,
    status          TEXT            DEFAULT 'active'
                        CHECK (status IN ('active','paused','archived')),
    embedding       vector(1536),   -- pgvector for semantic JD matching
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast vector similarity search
CREATE INDEX IF NOT EXISTS jobs_embedding_idx
    ON jobs USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

-- ── APPLICATIONS ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS applications (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id          UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    candidate_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    resume_url      TEXT,
    parsed_data     JSONB,
    ai_score        FLOAT           DEFAULT 0,
    status          TEXT            DEFAULT 'applied'
                        CHECK (status IN (
                            'applied','screening','invited','scheduled',
                            'interviewing','interviewed','offered','hired','rejected'
                        )),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (job_id, candidate_id)   -- prevent duplicate applications
);

-- ── INTERVIEWS ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS interviews (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id  UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    scheduled_at    TIMESTAMPTZ,
    status          TEXT            DEFAULT 'scheduled'
                        CHECK (status IN (
                            'scheduled','in_progress','completed','cancelled','no_show'
                        )),
    unique_link     TEXT,
    transcript      JSONB,
    proctoring_logs JSONB,
    termination_reason TEXT         DEFAULT 'completed',
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── ASSESSMENTS ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS assessments (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    interview_id            UUID UNIQUE REFERENCES interviews(id) ON DELETE CASCADE,

    -- 5-dimension scorecard
    overall_score           FLOAT,
    technical_score         FLOAT,
    behavioral_score        FLOAT,
    communication_score     FLOAT,
    cultural_fit_score      FLOAT,
    problem_solving_score   FLOAT,

    -- Salary
    expected_salary         INTEGER,
    negotiated_salary       INTEGER,

    -- Verdict
    verdict                 TEXT CHECK (verdict IN (
                                'strong_hire','hire','no_hire','strong_no_hire'
                            )),
    verdict_reasoning       TEXT,

    -- Breakdown
    key_strengths           TEXT[]  DEFAULT '{}',
    areas_of_improvement    TEXT[]  DEFAULT '{}',
    round_summaries         JSONB,
    detailed_report         JSONB,  -- full GPT output

    created_at              TIMESTAMPTZ DEFAULT NOW()
);

-- ── pgvector RPC: match_jobs ──────────────────────────────────────────────────
-- Called by the candidate job recommendation engine.
CREATE OR REPLACE FUNCTION match_jobs(
    query_embedding vector(1536),
    match_threshold FLOAT,
    match_count     INT
)
RETURNS TABLE (
    id          UUID,
    title       TEXT,
    description TEXT,
    similarity  FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        j.id,
        j.title,
        j.description,
        1 - (j.embedding <=> query_embedding) AS similarity
    FROM jobs j
    WHERE j.is_active = TRUE
      AND j.status = 'active'
      AND 1 - (j.embedding <=> query_embedding) > match_threshold
    ORDER BY j.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS applications_job_id_idx       ON applications(job_id);
CREATE INDEX IF NOT EXISTS applications_candidate_id_idx ON applications(candidate_id);
CREATE INDEX IF NOT EXISTS applications_status_idx       ON applications(status);
CREATE INDEX IF NOT EXISTS interviews_application_id_idx ON interviews(application_id);
CREATE INDEX IF NOT EXISTS assessments_interview_id_idx  ON assessments(interview_id);
CREATE INDEX IF NOT EXISTS jobs_recruiter_id_idx         ON jobs(recruiter_id);
CREATE INDEX IF NOT EXISTS jobs_is_active_idx            ON jobs(is_active);
CREATE INDEX IF NOT EXISTS profiles_verification_status_idx ON profiles(verification_status);

-- ── updated_at trigger ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER jobs_updated_at
    BEFORE UPDATE ON jobs
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER applications_updated_at
    BEFORE UPDATE ON applications
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── NOTIFICATIONS ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type        TEXT NOT NULL,   -- 'new_application' | 'assessment_ready' | 'interview_scheduled' | 'offer_sent' | 'verification_complete'
    title       TEXT NOT NULL,
    message     TEXT NOT NULL,
    link        TEXT,            -- frontend route to navigate to on click
    is_read     BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_is_read_idx ON notifications(user_id, is_read);
