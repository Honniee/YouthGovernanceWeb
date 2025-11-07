-- Migration: Add 'Survey Validation' category to Activity_Logs
-- Description: Extends Activity_Logs category constraint to include 'Survey Validation'
-- Safe to run multiple times (drops and recreates the constraint)

-- Drop existing constraint if present
ALTER TABLE "Activity_Logs"
DROP CONSTRAINT IF EXISTS "Activity_Logs_category_check";

-- Recreate constraint including existing categories plus 'Survey Validation'
ALTER TABLE "Activity_Logs"
ADD CONSTRAINT "Activity_Logs_category_check"
CHECK (
  category = ANY (ARRAY[
    'Authentication'::text,
    'User Management'::text,
    'Survey Management'::text,
    'Survey Validation'::text,
    'Announcement'::text,
    'Activity Log'::text,
    'Data Export'::text,
    'Data Management'::text,
    'System Management'::text,
    'SK Management'::text,
    'Term Management'::text,
    'Youth Management'::text,
    'Voter Management'::text,
    'Notification Management'::text,
    'Bulk Operations'::text,
    'System Events'::text,
    'Data Validation'::text,
    'Report Generation'::text,
    'File Management'::text,
    'Email Operations'::text,
    'Security Events'::text,
    'SK Governance'::text
  ])
);

-- Verify constraint
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conname = 'Activity_Logs_category_check' 
AND conrelid = '"Activity_Logs"'::regclass;



