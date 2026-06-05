-- Migration: Add onboarding_completed and related fields to profiles table
-- Run this if the columns don't already exist

-- Check if onboarding_completed column exists, if not add it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS 
        WHERE TABLE_NAME = 'profiles' AND COLUMN_NAME = 'onboarding_completed'
    ) THEN
        ALTER TABLE profiles ADD COLUMN onboarding_completed BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Column onboarding_completed added to profiles table';
    END IF;
END
$$;

-- Add other onboarding-related columns if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS 
        WHERE TABLE_NAME = 'profiles' AND COLUMN_NAME = 'location'
    ) THEN
        ALTER TABLE profiles ADD COLUMN location TEXT;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS 
        WHERE TABLE_NAME = 'profiles' AND COLUMN_NAME = 'work_status'
    ) THEN
        ALTER TABLE profiles ADD COLUMN work_status TEXT;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS 
        WHERE TABLE_NAME = 'profiles' AND COLUMN_NAME = 'current_company'
    ) THEN
        ALTER TABLE profiles ADD COLUMN current_company TEXT;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS 
        WHERE TABLE_NAME = 'profiles' AND COLUMN_NAME = 'job_title'
    ) THEN
        ALTER TABLE profiles ADD COLUMN job_title TEXT;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS 
        WHERE TABLE_NAME = 'profiles' AND COLUMN_NAME = 'current_salary'
    ) THEN
        ALTER TABLE profiles ADD COLUMN current_salary INTEGER;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS 
        WHERE TABLE_NAME = 'profiles' AND COLUMN_NAME = 'notice_period'
    ) THEN
        ALTER TABLE profiles ADD COLUMN notice_period TEXT;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS 
        WHERE TABLE_NAME = 'profiles' AND COLUMN_NAME = 'industry'
    ) THEN
        ALTER TABLE profiles ADD COLUMN industry TEXT;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS 
        WHERE TABLE_NAME = 'profiles' AND COLUMN_NAME = 'department'
    ) THEN
        ALTER TABLE profiles ADD COLUMN department TEXT;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS 
        WHERE TABLE_NAME = 'profiles' AND COLUMN_NAME = 'highest_qualification'
    ) THEN
        ALTER TABLE profiles ADD COLUMN highest_qualification TEXT;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS 
        WHERE TABLE_NAME = 'profiles' AND COLUMN_NAME = 'university'
    ) THEN
        ALTER TABLE profiles ADD COLUMN university TEXT;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS 
        WHERE TABLE_NAME = 'profiles' AND COLUMN_NAME = 'specialization'
    ) THEN
        ALTER TABLE profiles ADD COLUMN specialization TEXT;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS 
        WHERE TABLE_NAME = 'profiles' AND COLUMN_NAME = 'graduation_year'
    ) THEN
        ALTER TABLE profiles ADD COLUMN graduation_year INTEGER;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS 
        WHERE TABLE_NAME = 'profiles' AND COLUMN_NAME = 'preferred_locations'
    ) THEN
        ALTER TABLE profiles ADD COLUMN preferred_locations TEXT[] DEFAULT '{}';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS 
        WHERE TABLE_NAME = 'profiles' AND COLUMN_NAME = 'expected_salary'
    ) THEN
        ALTER TABLE profiles ADD COLUMN expected_salary INTEGER;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS 
        WHERE TABLE_NAME = 'profiles' AND COLUMN_NAME = 'resume_headline'
    ) THEN
        ALTER TABLE profiles ADD COLUMN resume_headline TEXT;
    END IF;
    
    RAISE NOTICE 'All onboarding columns have been checked/added';
END
$$;
