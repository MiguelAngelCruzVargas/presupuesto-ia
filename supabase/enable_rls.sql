-- Re-enable Row Level Security on projects table
-- This restores security so only authenticated users can access their own projects

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Verify RLS is enabled
-- You should see rls_enabled = true
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'projects';
