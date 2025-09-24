-- =============================================================================
-- Phase 1.2: Enhance KK_Survey_Responses Table for Validation Process
-- =============================================================================
-- Purpose: Add fields for voter list validation and duplicate prevention
-- Version: 1.0
-- Date: 2024
-- =============================================================================

-- Add fields for validation process
ALTER TABLE "KK_Survey_Responses" ADD COLUMN IF NOT EXISTS
    -- Personal info for validation (from survey form)
    survey_first_name VARCHAR(50),
    survey_last_name VARCHAR(50),
    survey_middle_name VARCHAR(50),
    survey_birth_date DATE,
    survey_gender TEXT CHECK (survey_gender IN ('Male', 'Female')),
    survey_barangay VARCHAR(50),
    
    -- Validation process fields
    voter_match_id VARCHAR(20), -- Reference to matched voter record
    validation_score DECIMAL(3,2), -- 0.00 to 1.00 match confidence
    validation_notes TEXT,
    
    -- Duplicate prevention
    is_duplicate BOOLEAN DEFAULT FALSE,
    original_response_id VARCHAR(20); -- If this is a duplicate

-- Add foreign key constraint for original_response_id (after column exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_kk_responses_original_response'
    ) THEN
        ALTER TABLE "KK_Survey_Responses" 
        ADD CONSTRAINT fk_kk_responses_original_response 
        FOREIGN KEY (original_response_id) REFERENCES "KK_Survey_Responses"(response_id);
    END IF;
END $$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_kk_responses_survey_names ON "KK_Survey_Responses" (survey_first_name, survey_last_name);
CREATE INDEX IF NOT EXISTS idx_kk_responses_survey_birth_date ON "KK_Survey_Responses" (survey_birth_date);
CREATE INDEX IF NOT EXISTS idx_kk_responses_survey_gender ON "KK_Survey_Responses" (survey_gender);
CREATE INDEX IF NOT EXISTS idx_kk_responses_voter_match ON "KK_Survey_Responses" (voter_match_id);
CREATE INDEX IF NOT EXISTS idx_kk_responses_validation_score ON "KK_Survey_Responses" (validation_score);
CREATE INDEX IF NOT EXISTS idx_kk_responses_duplicate ON "KK_Survey_Responses" (is_duplicate);
CREATE INDEX IF NOT EXISTS idx_kk_responses_original_response ON "KK_Survey_Responses" (original_response_id);

-- Add composite index for validation queries
CREATE INDEX IF NOT EXISTS idx_kk_responses_validation_lookup ON "KK_Survey_Responses" 
    (survey_first_name, survey_last_name, survey_birth_date, survey_gender);

-- Add comments for documentation
COMMENT ON COLUMN "KK_Survey_Responses".survey_first_name IS 'First name provided in survey form (for voter matching)';
COMMENT ON COLUMN "KK_Survey_Responses".survey_last_name IS 'Last name provided in survey form (for voter matching)';
COMMENT ON COLUMN "KK_Survey_Responses".survey_middle_name IS 'Middle name provided in survey form (for voter matching)';
COMMENT ON COLUMN "KK_Survey_Responses".survey_birth_date IS 'Birth date provided in survey form (for voter matching)';
COMMENT ON COLUMN "KK_Survey_Responses".survey_gender IS 'Gender provided in survey form (for voter matching)';
COMMENT ON COLUMN "KK_Survey_Responses".survey_barangay IS 'Barangay provided in survey form';
COMMENT ON COLUMN "KK_Survey_Responses".voter_match_id IS 'Reference to matched voter record in Voters_List';
COMMENT ON COLUMN "KK_Survey_Responses".validation_score IS 'Confidence score for voter match (0.00 to 1.00)';
COMMENT ON COLUMN "KK_Survey_Responses".validation_notes IS 'Notes about validation process and decisions';
COMMENT ON COLUMN "KK_Survey_Responses".is_duplicate IS 'Whether this response is a duplicate of another';
COMMENT ON COLUMN "KK_Survey_Responses".original_response_id IS 'Reference to original response if this is a duplicate';

-- =============================================================================
-- Migration completed
-- =============================================================================

SELECT 'KK_Survey_Responses table enhanced successfully!' as status;
