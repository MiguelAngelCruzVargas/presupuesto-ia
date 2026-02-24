-- Temporary fix: Disable RLS for testing
-- This allows you to save projects without authentication issues
-- WARNING: Only use this for development/testing!

ALTER TABLE projects DISABLE ROW LEVEL SECURITY;

-- To re-enable RLS later (for production), run:
-- ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
