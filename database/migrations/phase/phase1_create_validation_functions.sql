-- =============================================================================
-- Phase 1.5: Create Validation Functions
-- =============================================================================
-- Purpose: Create functions for automatic voter list validation and duplicate detection
-- Version: 1.0
-- Date: 2024
-- =============================================================================

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

-- Add comments for documentation
COMMENT ON FUNCTION validate_survey_response(VARCHAR) IS 'Validates a survey response against the voter list and returns validation tier, score, and match information';
COMMENT ON FUNCTION check_duplicate_participation(VARCHAR, VARCHAR) IS 'Checks if a voter has already participated in a specific batch';
COMMENT ON FUNCTION get_batch_validation_stats(VARCHAR) IS 'Returns comprehensive validation statistics for a batch including tier breakdown';

-- =============================================================================
-- Migration completed
-- =============================================================================

SELECT 'Validation functions created successfully!' as status;
