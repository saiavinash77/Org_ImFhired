-- HIREAI: Clean Slate Rebuild Script (ULTRA LOGICAL) 🎙️🚀
-- This script wipes all existing tables and re-creates them with a professional multi-table profile architecture.

-- 0. CLEANUP (EXTREME CARE!)
DROP TABLE IF EXISTS public.assessments CASCADE;
DROP TABLE IF EXISTS public.interviews CASCADE;
DROP TABLE IF EXISTS public.applications CASCADE;
DROP TABLE IF EXISTS public.jobs CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- Drop function specifically if it already exists with a different signature
DROP FUNCTION IF EXISTS public.match_jobs CASCADE;

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. CORE USERS TABLE (Identity & Role)
CREATE TABLE public.users (
  id UUID PRIMARY KEY, -- Matches Supabase Auth User ID
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('recruiter', 'candidate', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. PROFILES TABLE (Unified metadata, role-dependent fields)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  bio TEXT,
  
  -- Recruiter Specific
  company_name TEXT,
  company_website TEXT,
  
  -- Candidate Specific
  headline TEXT, -- e.g. "Fullstack Developer"
  skills TEXT[], -- Array of skills
  resume_url TEXT,
  parsed_data JSONB,
  experience_years FLOAT DEFAULT 0,
  
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. JOBS TABLE (Recruiter Listings)
CREATE TABLE public.jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recruiter_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  requirements TEXT[], -- Array of strings
  department TEXT DEFAULT 'Engineering',
  location TEXT,
  type TEXT DEFAULT 'full_time',
  
  -- Granular Data
  salary_min INTEGER DEFAULT 0,
  salary_max INTEGER DEFAULT 0,
  experience_min INTEGER DEFAULT 0,
  experience_max INTEGER DEFAULT 0,
  salary_range TEXT, -- Legacy/Display
  
  embedding VECTOR(1536), -- AI Matching
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'closed', 'archived')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. APPLICATIONS TABLE (The Link)
CREATE TABLE public.applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE NOT NULL,
  candidate_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  
  status TEXT NOT NULL DEFAULT 'applied' CHECK (status IN ('applied', 'screening', 'invited', 'scheduled', 'interviewing', 'interviewed', 'offered', 'hired', 'rejected')),
  resume_url TEXT,
  resume_summary TEXT, -- AI generated summary
  parsed_data JSONB DEFAULT '{}',
  ai_score FLOAT DEFAULT 0.0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(job_id, candidate_id) -- One application per job per candidate
);

-- 6. INTERVIEWS TABLE (Engagement)
CREATE TABLE public.interviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID REFERENCES public.applications(id) ON DELETE CASCADE NOT NULL,
  
  scheduled_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled', 'no_show')),
  unique_link TEXT UNIQUE,
  transcript JSONB DEFAULT '[]',
  proctoring_logs JSONB DEFAULT '[]',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. ASSESSMENTS TABLE (AI Reports — BRD §2.6 scorecard + security)
CREATE TABLE public.assessments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  interview_id UUID REFERENCES public.interviews(id) ON DELETE CASCADE UNIQUE NOT NULL,
  
  overall_score FLOAT DEFAULT 0.0,
  technical_score FLOAT DEFAULT 0.0,
  behavioral_score FLOAT DEFAULT 0.0,
  communication_score FLOAT DEFAULT 0.0,
  cultural_fit_score FLOAT DEFAULT 0.0,
  problem_solving_score FLOAT DEFAULT 0.0,
  
  verdict TEXT,
  verdict_reasoning TEXT,
  expected_salary INTEGER,
  negotiated_salary INTEGER,
  key_strengths JSONB DEFAULT '[]'::jsonb,
  areas_of_improvement JSONB DEFAULT '[]'::jsonb,
  round_summaries JSONB DEFAULT '[]'::jsonb,
  detailed_report JSONB DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. MATCH_JOBS FUNCTION (Vector Search)
CREATE OR REPLACE FUNCTION match_jobs (
  query_embedding VECTOR(1536),
  match_threshold FLOAT,
  match_count INT
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  salary_range TEXT,
  location TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    jobs.id,
    jobs.title,
    jobs.description,
    jobs.salary_range,
    jobs.location,
    1 - (jobs.embedding <=> query_embedding) AS similarity
  FROM jobs
  WHERE 1 - (jobs.embedding <=> query_embedding) > match_threshold
    AND jobs.is_active = true
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;

-- 9. CANDIDATE PIPELINE VIEW (Consolidated Dashboard)
DROP VIEW IF EXISTS public.candidate_pipeline;
CREATE VIEW public.candidate_pipeline AS
SELECT 
    a.id AS application_id,
    a.status,
    a.ai_score AS match_score,
    a.created_at AS applied_at,
    p.full_name AS candidate_name, -- JOINING PROFILES FOR NAME
    u.email AS candidate_email,
    j.title AS job_title,
    i.id AS interview_id,
    i.scheduled_at,
    asmnt.overall_score,
    asmnt.verdict
FROM public.applications a
JOIN public.users u ON u.id = a.candidate_id
JOIN public.profiles p ON p.id = u.id
JOIN public.jobs j ON j.id = a.job_id
LEFT JOIN public.interviews i ON i.application_id = a.id
LEFT JOIN public.assessments asmnt ON asmnt.interview_id = i.id;

-- 10. RLS POLICIES (Security)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;

-- Basic "Allow All" for testing (Update later)
CREATE POLICY "Allow all public" ON public.users FOR ALL USING (true);
CREATE POLICY "Allow all public" ON public.profiles FOR ALL USING (true);
CREATE POLICY "Allow all public" ON public.jobs FOR ALL USING (true);
CREATE POLICY "Allow all public" ON public.applications FOR ALL USING (true);
CREATE POLICY "Allow all public" ON public.interviews FOR ALL USING (true);
CREATE POLICY "Allow all public" ON public.assessments FOR ALL USING (true);
