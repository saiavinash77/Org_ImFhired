-- HIREAI: Non-destructive Supabase setup/repair script.
-- Use this in Supabase SQL Editor when tables are missing or older columns are absent.
-- It creates the schema needed by the current FastAPI + Next.js app without dropping data.

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'candidate',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'candidate',
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check
  CHECK (role IN ('recruiter', 'candidate', 'admin'));

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT 'User',
  phone TEXT,
  avatar_url TEXT,
  bio TEXT,
  company_name TEXT,
  company_website TEXT,
  headline TEXT,
  skills TEXT[] DEFAULT ARRAY[]::TEXT[],
  resume_url TEXT,
  parsed_data JSONB,
  experience_years FLOAT DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS full_name TEXT DEFAULT 'User',
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS company_name TEXT,
  ADD COLUMN IF NOT EXISTS company_website TEXT,
  ADD COLUMN IF NOT EXISTS headline TEXT,
  ADD COLUMN IF NOT EXISTS skills TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS resume_url TEXT,
  ADD COLUMN IF NOT EXISTS parsed_data JSONB,
  ADD COLUMN IF NOT EXISTS experience_years FLOAT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  -- Onboarding fields
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS work_status TEXT,
  ADD COLUMN IF NOT EXISTS current_company TEXT,
  ADD COLUMN IF NOT EXISTS job_title TEXT,
  ADD COLUMN IF NOT EXISTS current_salary INTEGER,
  ADD COLUMN IF NOT EXISTS notice_period TEXT,
  ADD COLUMN IF NOT EXISTS industry TEXT,
  ADD COLUMN IF NOT EXISTS department TEXT,
  ADD COLUMN IF NOT EXISTS highest_qualification TEXT,
  ADD COLUMN IF NOT EXISTS university TEXT,
  ADD COLUMN IF NOT EXISTS specialization TEXT,
  ADD COLUMN IF NOT EXISTS graduation_year INTEGER,
  ADD COLUMN IF NOT EXISTS preferred_locations TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS expected_salary INTEGER,
  ADD COLUMN IF NOT EXISTS resume_headline TEXT;

UPDATE public.profiles SET full_name = 'User' WHERE full_name IS NULL;
ALTER TABLE public.profiles ALTER COLUMN full_name SET DEFAULT 'User';
ALTER TABLE public.profiles ALTER COLUMN full_name SET NOT NULL;

CREATE TABLE IF NOT EXISTS public.jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recruiter_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  requirements TEXT[] DEFAULT ARRAY[]::TEXT[],
  department TEXT DEFAULT 'Engineering',
  location TEXT,
  type TEXT DEFAULT 'full_time',
  salary_min INTEGER DEFAULT 0,
  salary_max INTEGER DEFAULT 0,
  experience_min INTEGER DEFAULT 0,
  experience_max INTEGER DEFAULT 0,
  salary_range TEXT,
  embedding VECTOR(1536),
  status TEXT DEFAULT 'active',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS recruiter_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS requirements TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS department TEXT DEFAULT 'Engineering',
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'full_time',
  ADD COLUMN IF NOT EXISTS salary_min INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS salary_max INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS experience_min INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS experience_max INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS salary_range TEXT,
  ADD COLUMN IF NOT EXISTS embedding VECTOR(1536),
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;

ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_status_check;
ALTER TABLE public.jobs ADD CONSTRAINT jobs_status_check
  CHECK (status IN ('active', 'paused', 'closed', 'archived'));

CREATE TABLE IF NOT EXISTS public.applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE NOT NULL,
  candidate_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'applied',
  resume_url TEXT,
  resume_summary TEXT,
  parsed_data JSONB DEFAULT '{}'::jsonb,
  ai_score FLOAT DEFAULT 0.0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(job_id, candidate_id)
);

ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS candidate_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'applied',
  ADD COLUMN IF NOT EXISTS resume_url TEXT,
  ADD COLUMN IF NOT EXISTS resume_summary TEXT,
  ADD COLUMN IF NOT EXISTS parsed_data JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS ai_score FLOAT DEFAULT 0.0,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;

ALTER TABLE public.applications DROP CONSTRAINT IF EXISTS applications_status_check;
ALTER TABLE public.applications ADD CONSTRAINT applications_status_check
  CHECK (status IN ('applied', 'screening', 'invited', 'scheduled', 'interviewing', 'interviewed', 'offered', 'hired', 'rejected'));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'applications_job_id_candidate_id_key'
      AND conrelid = 'public.applications'::regclass
  ) THEN
    ALTER TABLE public.applications ADD CONSTRAINT applications_job_id_candidate_id_key UNIQUE(job_id, candidate_id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.interviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID REFERENCES public.applications(id) ON DELETE CASCADE NOT NULL,
  scheduled_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'scheduled',
  unique_link TEXT UNIQUE,
  transcript JSONB DEFAULT '[]'::jsonb,
  proctoring_logs JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.interviews
  ADD COLUMN IF NOT EXISTS application_id UUID REFERENCES public.applications(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'scheduled',
  ADD COLUMN IF NOT EXISTS unique_link TEXT,
  ADD COLUMN IF NOT EXISTS transcript JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS proctoring_logs JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;

ALTER TABLE public.interviews DROP CONSTRAINT IF EXISTS interviews_status_check;
ALTER TABLE public.interviews ADD CONSTRAINT interviews_status_check
  CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled', 'no_show'));

CREATE TABLE IF NOT EXISTS public.assessments (
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
  detailed_report JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.assessments
  ADD COLUMN IF NOT EXISTS interview_id UUID REFERENCES public.interviews(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS overall_score FLOAT DEFAULT 0.0,
  ADD COLUMN IF NOT EXISTS technical_score FLOAT DEFAULT 0.0,
  ADD COLUMN IF NOT EXISTS behavioral_score FLOAT DEFAULT 0.0,
  ADD COLUMN IF NOT EXISTS communication_score FLOAT DEFAULT 0.0,
  ADD COLUMN IF NOT EXISTS cultural_fit_score FLOAT DEFAULT 0.0,
  ADD COLUMN IF NOT EXISTS problem_solving_score FLOAT DEFAULT 0.0,
  ADD COLUMN IF NOT EXISTS verdict TEXT,
  ADD COLUMN IF NOT EXISTS verdict_reasoning TEXT,
  ADD COLUMN IF NOT EXISTS expected_salary INTEGER,
  ADD COLUMN IF NOT EXISTS negotiated_salary INTEGER,
  ADD COLUMN IF NOT EXISTS key_strengths JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS areas_of_improvement JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS round_summaries JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS detailed_report JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;

CREATE OR REPLACE FUNCTION public.match_jobs (
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
  FROM public.jobs
  WHERE jobs.embedding IS NOT NULL
    AND 1 - (jobs.embedding <=> query_embedding) > match_threshold
    AND jobs.is_active = true
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;

DROP VIEW IF EXISTS public.candidate_pipeline;
CREATE VIEW public.candidate_pipeline AS
SELECT
  a.id AS application_id,
  a.status,
  a.ai_score AS match_score,
  a.created_at AS applied_at,
  p.full_name AS candidate_name,
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

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'users' AND policyname = 'Allow all public') THEN
    CREATE POLICY "Allow all public" ON public.users FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Allow all public') THEN
    CREATE POLICY "Allow all public" ON public.profiles FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'jobs' AND policyname = 'Allow all public') THEN
    CREATE POLICY "Allow all public" ON public.jobs FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'applications' AND policyname = 'Allow all public') THEN
    CREATE POLICY "Allow all public" ON public.applications FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'interviews' AND policyname = 'Allow all public') THEN
    CREATE POLICY "Allow all public" ON public.interviews FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'assessments' AND policyname = 'Allow all public') THEN
    CREATE POLICY "Allow all public" ON public.assessments FOR ALL USING (true);
  END IF;
END $$;
