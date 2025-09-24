-- Migration: Add is_active column to Voters_List table
-- Date: 2024-12-19
-- Description: Add is_active column for soft delete functionality

-- Add is_active column with default value true
ALTER TABLE "Voters_List" 
ADD COLUMN is_active BOOLEAN DEFAULT TRUE;

-- Create index for better query performance
CREATE INDEX idx_voters_list_active ON "Voters_List" (is_active);

-- Update existing records to be active by default
UPDATE "Voters_List" 
SET is_active = TRUE 
WHERE is_active IS NULL;

-- Make the column NOT NULL after setting default values
ALTER TABLE "Voters_List" 
ALTER COLUMN is_active SET NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN "Voters_List".is_active IS 'Flag to indicate if the voter record is active (true) or archived (false)';
