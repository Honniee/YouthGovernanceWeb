-- =============================================================================
-- Phase 1.4: Update calculate_batch_statistics Function
-- =============================================================================
-- Purpose: Replace hardcoded statistics with real-time calculations based on voter list
-- Version: 1.0
-- Date: 2024
-- =============================================================================

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

-- Add comment for documentation
COMMENT ON FUNCTION calculate_batch_statistics(VARCHAR) IS 'Calculates comprehensive statistics for a specific batch using real voter data from Voters_List table instead of hardcoded values';

-- =============================================================================
-- Migration completed
-- =============================================================================

SELECT 'calculate_batch_statistics function updated successfully!' as status;
