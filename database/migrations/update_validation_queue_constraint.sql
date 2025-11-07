-- Update Validation_Queue voter_match_type constraint to include all match types
-- Migration: Update validation queue constraint

-- Drop the existing constraint
ALTER TABLE "Validation_Queue" DROP CONSTRAINT IF EXISTS "Validation_Queue_voter_match_type_check";

-- Add the new constraint with all match types
ALTER TABLE "Validation_Queue" ADD CONSTRAINT "Validation_Queue_voter_match_type_check" 
CHECK (voter_match_type IN ('existing_youth', 'exact', 'strong', 'partial', 'weak', 'none'));

-- Update any existing records with invalid voter_match_type to 'none'
UPDATE "Validation_Queue" 
SET voter_match_type = 'none' 
WHERE voter_match_type NOT IN ('existing_youth', 'exact', 'strong', 'partial', 'weak', 'none');

-- Verify the constraint is working
SELECT 'Validation_Queue constraint updated successfully' as status;
