-- Migration: Add validation_status to Youth_Profiling table
-- This allows validation to be tracked at the youth profile level,
-- so once a youth is validated, all their future survey responses are automatically validated.

-- Add validation_status column to Youth_Profiling
ALTER TABLE "Youth_Profiling" 
ADD COLUMN validation_status TEXT CHECK (validation_status IN ('pending', 'validated', 'rejected')) DEFAULT 'pending';

-- Add validation_tier column to Youth_Profiling
ALTER TABLE "Youth_Profiling" 
ADD COLUMN validation_tier TEXT CHECK (validation_tier IN ('automatic', 'manual', 'final')) DEFAULT NULL;

-- Add validated_by column to Youth_Profiling (User ID who validated - can be admin/LYDO staff or SK official)
ALTER TABLE "Youth_Profiling" 
ADD COLUMN validated_by VARCHAR(20) DEFAULT NULL;

-- Add validation_date column to Youth_Profiling
ALTER TABLE "Youth_Profiling" 
ADD COLUMN validation_date TIMESTAMP DEFAULT NULL;

-- Add validation_comments column to Youth_Profiling
ALTER TABLE "Youth_Profiling" 
ADD COLUMN validation_comments TEXT DEFAULT NULL;

-- Add foreign key constraint for validated_by (references Users table to support both admins and SK officials)
ALTER TABLE "Youth_Profiling" 
ADD CONSTRAINT fk_youth_profiling_validated_by 
FOREIGN KEY (validated_by) REFERENCES "Users"(user_id) ON DELETE SET NULL;

-- Create index for validation_status for faster queries
CREATE INDEX idx_youth_profiling_validation_status ON "Youth_Profiling" (validation_status);

-- Create index for validation_tier
CREATE INDEX idx_youth_profiling_validation_tier ON "Youth_Profiling" (validation_tier);

-- Update existing youth profiles:
-- If they have at least one validated survey response, mark the profile as validated
UPDATE "Youth_Profiling" yp
SET 
  validation_status = 'validated',
  validation_tier = 'automatic',
  validation_date = (
    SELECT MIN(ksr.validation_date) 
    FROM "KK_Survey_Responses" ksr 
    WHERE ksr.youth_id = yp.youth_id 
      AND ksr.validation_status = 'validated'
  )
WHERE EXISTS (
  SELECT 1 
  FROM "KK_Survey_Responses" ksr 
  WHERE ksr.youth_id = yp.youth_id 
    AND ksr.validation_status = 'validated'
);

-- Add comment to explain the column
COMMENT ON COLUMN "Youth_Profiling".validation_status IS 'Validation status of the youth profile. Once validated, all future survey responses are automatically validated.';
COMMENT ON COLUMN "Youth_Profiling".validation_tier IS 'Tier of validation: automatic (voter match), manual (SK review), or final (approved/rejected)';
COMMENT ON COLUMN "Youth_Profiling".validated_by IS 'User ID (from Users table) who validated this youth profile. Can be admin/LYDO staff or SK official.';
COMMENT ON COLUMN "Youth_Profiling".validation_date IS 'Date and time when the youth profile was validated';

