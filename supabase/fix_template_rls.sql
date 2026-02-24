-- Fix RLS policies for project_templates to ensure public templates are visible

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can view their own and public templates" ON project_templates;

-- Create a new policy that allows:
-- 1. Users to view their own templates (public or private)
-- 2. ALL authenticated users to view public templates from ANY user
-- 3. Anonymous users can also view public templates (for public browsing)
CREATE POLICY "Users can view their own and public templates" ON project_templates
    FOR SELECT USING (
        -- Own templates (any visibility)
        auth.uid() = user_id 
        OR 
        -- Public templates (visible to everyone including anonymous)
        is_public = true
    );

-- Verify the policy was created
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'project_templates' AND policyname = 'Users can view their own and public templates';

