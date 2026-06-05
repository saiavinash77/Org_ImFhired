-- ============================================================
-- RESET SCRIPT: Clear all user data and auth-related tables
-- Run this to start fresh with authentication
-- ============================================================

-- Disable foreign key constraints temporarily
ALTER TABLE IF EXISTS notifications DISABLE TRIGGER ALL;
ALTER TABLE IF EXISTS assessments DISABLE TRIGGER ALL;
ALTER TABLE IF EXISTS interviews DISABLE TRIGGER ALL;
ALTER TABLE IF EXISTS applications DISABLE TRIGGER ALL;
ALTER TABLE IF EXISTS verification_interviews DISABLE TRIGGER ALL;
ALTER TABLE IF EXISTS profiles DISABLE TRIGGER ALL;
ALTER TABLE IF EXISTS jobs DISABLE TRIGGER ALL;
ALTER TABLE IF EXISTS users DISABLE TRIGGER ALL;

-- Clear all data in order of dependencies
TRUNCATE TABLE notifications CASCADE;
TRUNCATE TABLE assessments CASCADE;
TRUNCATE TABLE interviews CASCADE;
TRUNCATE TABLE applications CASCADE;
TRUNCATE TABLE verification_interviews CASCADE;
TRUNCATE TABLE profiles CASCADE;
TRUNCATE TABLE jobs CASCADE;
TRUNCATE TABLE users CASCADE;

-- Re-enable triggers
ALTER TABLE IF EXISTS users ENABLE TRIGGER ALL;
ALTER TABLE IF EXISTS jobs ENABLE TRIGGER ALL;
ALTER TABLE IF EXISTS profiles ENABLE TRIGGER ALL;
ALTER TABLE IF EXISTS verification_interviews ENABLE TRIGGER ALL;
ALTER TABLE IF EXISTS applications ENABLE TRIGGER ALL;
ALTER TABLE IF EXISTS interviews ENABLE TRIGGER ALL;
ALTER TABLE IF EXISTS assessments ENABLE TRIGGER ALL;
ALTER TABLE IF EXISTS notifications ENABLE TRIGGER ALL;

-- Reset sequences
ALTER SEQUENCE IF EXISTS users_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS profiles_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS jobs_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS applications_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS interviews_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS assessments_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS notifications_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS verification_interviews_id_seq RESTART WITH 1;

-- Verify tables are empty
SELECT 'users' as table_name, COUNT(*) as row_count FROM users
UNION ALL
SELECT 'profiles', COUNT(*) FROM profiles
UNION ALL
SELECT 'jobs', COUNT(*) FROM jobs
UNION ALL
SELECT 'applications', COUNT(*) FROM applications
UNION ALL
SELECT 'interviews', COUNT(*) FROM interviews
UNION ALL
SELECT 'assessments', COUNT(*) FROM assessments
UNION ALL
SELECT 'verification_interviews', COUNT(*) FROM verification_interviews
UNION ALL
SELECT 'notifications', COUNT(*) FROM notifications;
