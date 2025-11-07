-- Migration: Add SK Governance category to Activity_Logs
-- Description: Adds 'SK Governance' category to Activity_Logs category constraint for SK Terms activities
-- Date: 2025-11-02

-- Drop the existing constraint
ALTER TABLE "Activity_Logs" 
DROP CONSTRAINT IF EXISTS "Activity_Logs_category_check";

-- Add the constraint with SK Governance category
ALTER TABLE "Activity_Logs"
ADD CONSTRAINT "Activity_Logs_category_check" 
CHECK (category = ANY (ARRAY[
    'Authentication'::text, 
    'User Management'::text, 
    'Survey Management'::text, 
    'Announcement'::text, 
    'Activity Log'::text, 
    'Data Export'::text, 
    'Data Management'::text, 
    'System Management'::text,
    'SK Governance'::text
]));

-- Verify the constraint was added
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conname = 'Activity_Logs_category_check' 
AND conrelid = '"Activity_Logs"'::regclass;

