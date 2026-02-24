-- Migration: Add data column to projects table
-- This column stores the full project data as JSON for backward compatibility

ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS data JSONB;

-- Add location column if it doesn't exist (referenced in SupabaseService)
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS location TEXT;

-- Create index for faster JSON queries
CREATE INDEX IF NOT EXISTS idx_projects_data ON projects USING GIN (data);

-- Comment for documentation
COMMENT ON COLUMN projects.data IS 'Full project data stored as JSON including items, scheduleData, materialList, etc.';
COMMENT ON COLUMN projects.location IS 'Project location (city, state)';
