-- =============================================================================
-- Phase 1 Master Migration: Survey Batch Statistics System
-- =============================================================================
-- Purpose: Complete Phase 1 implementation - Database Schema & Functions
-- Version: 1.0
-- Date: 2024
-- =============================================================================

-- Start transaction for atomic migration
BEGIN;

-- Log migration start
DO $$
BEGIN
    RAISE NOTICE 'Starting Phase 1 Migration: Survey Batch Statistics System';
    RAISE NOTICE 'Timestamp: %', NOW();
END $$;

-- =============================================================================
-- Step 1.1: Update Voters_List Table
-- =============================================================================
DO $$
BEGIN
    RAISE NOTICE 'Step 1.1: Updating Voters_List table...';
END $$;

-- Add missing fields for better matching
ALTER TABLE "Voters_List" ADD COLUMN IF NOT EXISTS
    municipality VARCHAR(50) DEFAULT 'San Jose',
    province VARCHAR(50) DEFAULT 'Batangas',
    region VARCHAR(50) DEFAULT 'Region IV-A (CALABARZON)',
    is_active BOOLEAN DEFAULT TRUE;

-- Add computed age column (automatically calculated from birth_date)
ALTER TABLE "Voters_List" ADD COLUMN IF NOT EXISTS
    age INTEGER GENERATED ALWAYS AS (EXTRACT(YEAR FROM CURRENT_DATE) - EXTRACT(YEAR FROM birth_date)) STORED;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_voters_list_municipality ON "Voters_List" (municipality);
CREATE INDEX IF NOT EXISTS idx_voters_list_province ON "Voters_List" (province);
CREATE INDEX IF NOT EXISTS idx_voters_list_age ON "Voters_List" (age);
CREATE INDEX IF NOT EXISTS idx_voters_list_active ON "Voters_List" (is_active);
CREATE INDEX IF NOT EXISTS idx_voters_list_location_age_active ON "Voters_List" (municipality, province, age, is_active);

-- Update existing records to have default values
UPDATE "Voters_List" 
SET 
    municipality = 'San Jose',
    province = 'Batangas',
    region = 'Region IV-A (CALABARZON)',
    is_active = TRUE
WHERE municipality IS NULL OR province IS NULL OR region IS NULL OR is_active IS NULL;

-- =============================================================================
-- Step 1.2: Enhance KK_Survey_Responses Table
-- =============================================================================
DO $$
BEGIN
    RAISE NOTICE 'Step 1.2: Enhancing KK_Survey_Responses table...';
END $$;

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
CREATE INDEX IF NOT EXISTS idx_kk_responses_validation_lookup ON "KK_Survey_Responses" 
    (survey_first_name, survey_last_name, survey_birth_date, survey_gender);

-- =============================================================================
-- Step 1.3: Create Youth Participation Tracking Table
-- =============================================================================
DO $$
BEGIN
    RAISE NOTICE 'Step 1.3: Creating Youth_Participation_Tracking table...';
END $$;

-- Create Youth_Participation_Tracking table
CREATE TABLE IF NOT EXISTS "Youth_Participation_Tracking" (
    tracking_id VARCHAR(20) PRIMARY KEY,
    voter_id VARCHAR(20) NOT NULL, -- Reference to Voters_List
    batch_id VARCHAR(20) NOT NULL,
    response_id VARCHAR(20) NOT NULL,
    participation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    validation_status TEXT CHECK (validation_status IN ('pending', 'validated', 'rejected')) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    FOREIGN KEY (voter_id) REFERENCES "Voters_List"(voter_id) ON DELETE CASCADE,
    FOREIGN KEY (batch_id) REFERENCES "KK_Survey_Batches"(batch_id) ON DELETE CASCADE,
    FOREIGN KEY (response_id) REFERENCES "KK_Survey_Responses"(response_id) ON DELETE CASCADE,
    
    -- Unique constraint to prevent duplicate participation per batch
    UNIQUE(voter_id, batch_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_youth_participation_voter_id ON "Youth_Participation_Tracking" (voter_id);
CREATE INDEX IF NOT EXISTS idx_youth_participation_batch_id ON "Youth_Participation_Tracking" (batch_id);
CREATE INDEX IF NOT EXISTS idx_youth_participation_response_id ON "Youth_Participation_Tracking" (response_id);
CREATE INDEX IF NOT EXISTS idx_youth_participation_validation_status ON "Youth_Participation_Tracking" (validation_status);
CREATE INDEX IF NOT EXISTS idx_youth_participation_date ON "Youth_Participation_Tracking" (participation_date);
CREATE INDEX IF NOT EXISTS idx_youth_participation_voter_batch ON "Youth_Participation_Tracking" (voter_id, batch_id);
CREATE INDEX IF NOT EXISTS idx_youth_participation_batch_status ON "Youth_Participation_Tracking" (batch_id, validation_status);

-- =============================================================================
-- Step 1.4: Update calculate_batch_statistics Function
-- =============================================================================
DO $$
BEGIN
    RAISE NOTICE 'Step 1.4: Updating calculate_batch_statistics function...';
END $$;

-- Drop and recreate the calculate_batch_statistics function with proper voter list integration
CREATE OR REPLACE FUNCTION calculate_batch_statistics(batch_id_param VARCHAR(20))
RETURNS TABLE(
    total_responses INTEGER,
    validated_responses INTEGER,
    rejected_responses INTEGER,
    pending_responses INTEGER,
    total_eligible_voters INTEGER,        -- From Voters_List (ages 15-30, San Jose)
    response_rate DECIMAL(5,2),           -- validated_responses / total_eligible_voters
    validation_rate DECIMAL(5,2),         -- validated_responses / total_responses
    automatic_validations INTEGER,        -- Auto-validated responses
    manual_validations INTEGER,           -- Manually validated responses
    final_reviews INTEGER                 -- Final review responses
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        -- Response counts
        COALESCE(COUNT(ksr.response_id), 0)::INTEGER as total_responses,
        COALESCE(COUNT(ksr.response_id) FILTER (WHERE ksr.validation_status = 'validated'), 0)::INTEGER as validated_responses,
        COALESCE(COUNT(ksr.response_id) FILTER (WHERE ksr.validation_status = 'rejected'), 0)::INTEGER as rejected_responses,
        COALESCE(COUNT(ksr.response_id) FILTER (WHERE ksr.validation_status = 'pending'), 0)::INTEGER as pending_responses,
        
        -- Eligible voter count (from voter list, ages 15-30, San Jose)
        (SELECT COUNT(*) FROM "Voters_List" vl 
         WHERE vl.is_active = true 
           AND vl.municipality = 'San Jose' 
           AND vl.province = 'Batangas'
           AND vl.age BETWEEN 15 AND 30)::INTEGER as total_eligible_voters,
        
        -- Response rate (validated responses / eligible voters)
        CASE 
            WHEN (SELECT COUNT(*) FROM "Voters_List" vl 
                  WHERE vl.is_active = true 
                    AND vl.municipality = 'San Jose' 
                    AND vl.province = 'Batangas'
                    AND vl.age BETWEEN 15 AND 30) > 0 
            THEN ROUND((COUNT(ksr.response_id) FILTER (WHERE ksr.validation_status = 'validated')::DECIMAL / 
                (SELECT COUNT(*) FROM "Voters_List" vl 
                 WHERE vl.is_active = true 
                   AND vl.municipality = 'San Jose' 
                   AND vl.province = 'Batangas'
                   AND vl.age BETWEEN 15 AND 30)) * 100, 2)
            ELSE 0.00
        END as response_rate,
        
        -- Validation rate (validated / total responses)
        CASE 
            WHEN COUNT(ksr.response_id) > 0 THEN ROUND((COUNT(ksr.response_id) FILTER (WHERE ksr.validation_status = 'validated')::DECIMAL / COUNT(ksr.response_id)) * 100, 2)
            ELSE 0.00
        END as validation_rate,
        
        -- Validation tier breakdown
        COALESCE(COUNT(ksr.response_id) FILTER (WHERE ksr.validation_tier = 'automatic'), 0)::INTEGER as automatic_validations,
        COALESCE(COUNT(ksr.response_id) FILTER (WHERE ksr.validation_tier = 'manual'), 0)::INTEGER as manual_validations,
        COALESCE(COUNT(ksr.response_id) FILTER (WHERE ksr.validation_tier = 'final'), 0)::INTEGER as final_reviews
        
    FROM "KK_Survey_Responses" ksr
    WHERE ksr.batch_id = batch_id_param;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Step 1.5: Create Validation Functions
-- =============================================================================
DO $$
BEGIN
    RAISE NOTICE 'Step 1.5: Creating validation functions...';
END $$;

-- Function to validate survey response against voter list
CREATE OR REPLACE FUNCTION validate_survey_response(
    p_response_id VARCHAR(20)
) RETURNS TABLE(
    validation_tier TEXT,
    validation_score DECIMAL(3,2),
    voter_match_id VARCHAR(20),
    validation_notes TEXT
) AS $$
DECLARE
    response_record RECORD;
    voter_match RECORD;
    match_score DECIMAL(3,2) := 0.0;
    tier_result TEXT := 'manual';
BEGIN
    -- Get survey response details
    SELECT * INTO response_record 
    FROM "KK_Survey_Responses" 
    WHERE response_id = p_response_id;
    
    -- Try to find voter match
    SELECT vl.*, 
           -- Calculate match score
           CASE 
               WHEN LOWER(TRIM(vl.first_name)) = LOWER(TRIM(response_record.survey_first_name)) THEN 0.3
               ELSE 0.0
           END +
           CASE 
               WHEN LOWER(TRIM(vl.last_name)) = LOWER(TRIM(response_record.survey_last_name)) THEN 0.3
               ELSE 0.0
           END +
           CASE 
               WHEN vl.birth_date = response_record.survey_birth_date THEN 0.3
               ELSE 0.0
           END +
           CASE 
               WHEN vl.gender = response_record.survey_gender THEN 0.1
               ELSE 0.0
           END as calculated_score
    INTO voter_match
    FROM "Voters_List" vl
    WHERE vl.is_active = true
      AND vl.municipality = 'San Jose'
      AND vl.province = 'Batangas'
      AND vl.age BETWEEN 15 AND 30
    ORDER BY calculated_score DESC
    LIMIT 1;
    
    -- Determine validation tier based on match score
    IF voter_match.calculated_score >= 0.9 THEN
        tier_result := 'automatic';
    ELSIF voter_match.calculated_score >= 0.6 THEN
        tier_result := 'manual';
    ELSE
        tier_result := 'manual';
    END IF;
    
    RETURN QUERY SELECT 
        tier_result,
        COALESCE(voter_match.calculated_score, 0.0),
        voter_match.voter_id,
        CASE 
            WHEN voter_match.calculated_score >= 0.9 THEN 'Automatic validation - high confidence match'
            WHEN voter_match.calculated_score >= 0.6 THEN 'Manual validation required - partial match'
            ELSE 'Manual validation required - no voter match found'
        END;
END;
$$ LANGUAGE plpgsql;

-- Function to check duplicate participation
CREATE OR REPLACE FUNCTION check_duplicate_participation(
    p_voter_id VARCHAR(20),
    p_batch_id VARCHAR(20)
) RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS(
        SELECT 1 FROM "Youth_Participation_Tracking" 
        WHERE voter_id = p_voter_id 
          AND batch_id = p_batch_id 
          AND validation_status = 'validated'
    );
END;
$$ LANGUAGE plpgsql;

-- Function to get validation statistics for a batch
CREATE OR REPLACE FUNCTION get_batch_validation_stats(batch_id_param VARCHAR(20))
RETURNS TABLE(
    total_responses INTEGER,
    automatic_validations INTEGER,
    manual_validations INTEGER,
    final_reviews INTEGER,
    pending_validations INTEGER,
    validation_breakdown JSON
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_responses,
        COUNT(*) FILTER (WHERE validation_tier = 'automatic')::INTEGER as automatic_validations,
        COUNT(*) FILTER (WHERE validation_tier = 'manual')::INTEGER as manual_validations,
        COUNT(*) FILTER (WHERE validation_tier = 'final')::INTEGER as final_reviews,
        COUNT(*) FILTER (WHERE validation_status = 'pending')::INTEGER as pending_validations,
        json_build_object(
            'automatic', COUNT(*) FILTER (WHERE validation_tier = 'automatic'),
            'manual', COUNT(*) FILTER (WHERE validation_tier = 'manual'),
            'final', COUNT(*) FILTER (WHERE validation_tier = 'final'),
            'pending', COUNT(*) FILTER (WHERE validation_status = 'pending')
        ) as validation_breakdown
    FROM "KK_Survey_Responses"
    WHERE batch_id = batch_id_param;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Step 1.6: Update active_batches_with_stats View
-- =============================================================================
DO $$
BEGIN
    RAISE NOTICE 'Step 1.6: Updating active_batches_with_stats view...';
END $$;

-- Drop the existing view
DROP VIEW IF EXISTS active_batches_with_stats;

-- Recreate the view with new statistics structure
CREATE OR REPLACE VIEW active_batches_with_stats AS
SELECT 
    kb.*,
    -- Response statistics
    stats.total_responses,
    stats.validated_responses,
    stats.rejected_responses,
    stats.pending_responses,
    
    -- Population statistics
    stats.total_eligible_voters,
    
    -- Rate calculations
    stats.response_rate,
    stats.validation_rate,
    
    -- Validation tier breakdown
    stats.automatic_validations,
    stats.manual_validations,
    stats.final_reviews,
    
    -- Time-based calculations
    CASE 
        WHEN kb.status = 'active' THEN (kb.end_date - CURRENT_DATE)
        ELSE NULL
    END as days_remaining,
    
    CASE 
        WHEN kb.status = 'active' AND CURRENT_DATE > kb.end_date THEN true
        ELSE false
    END as is_overdue,
    
    -- Additional calculated fields
    CASE 
        WHEN stats.total_eligible_voters > 0 THEN 
            (stats.total_eligible_voters - stats.validated_responses)
        ELSE 0
    END as youths_not_surveyed,
    
    CASE 
        WHEN stats.total_responses > 0 THEN 
            ROUND((stats.automatic_validations::DECIMAL / stats.total_responses) * 100, 2)
        ELSE 0.00
    END as automatic_validation_rate,
    
    CASE 
        WHEN stats.total_responses > 0 THEN 
            ROUND((stats.manual_validations::DECIMAL / stats.total_responses) * 100, 2)
        ELSE 0.00
    END as manual_validation_rate

FROM "KK_Survey_Batches" kb
LEFT JOIN LATERAL calculate_batch_statistics(kb.batch_id) stats ON true
WHERE kb.status IN ('active', 'draft');

-- =============================================================================
-- Migration Completion
-- =============================================================================
DO $$
BEGIN
    RAISE NOTICE 'Phase 1 Migration completed successfully!';
    RAISE NOTICE 'Timestamp: %', NOW();
    RAISE NOTICE 'All database schema and functions have been updated for the new statistics system.';
END $$;

-- Commit the transaction
COMMIT;

-- Final success message
SELECT 'Phase 1 Migration: Survey Batch Statistics System - COMPLETED SUCCESSFULLY!' as status;
