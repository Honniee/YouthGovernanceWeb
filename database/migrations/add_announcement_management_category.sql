-- Update Activity_Logs category check to include 'Announcement Management'
-- and keep backward compatibility with existing 'Announcement' entries

ALTER TABLE public."Activity_Logs"
DROP CONSTRAINT IF EXISTS "Activity_Logs_category_check";

ALTER TABLE public."Activity_Logs"
ADD CONSTRAINT "Activity_Logs_category_check"
CHECK (category = ANY (ARRAY[
  'Authentication',
  'User Management',
  'Survey Management',
  'Survey Validation',
  'Announcement',               -- legacy
  'Announcement Management',    -- new
  'Activity Log',
  'Data Export',
  'Data Management',
  'System Management',
  'SK Governance'
]));



