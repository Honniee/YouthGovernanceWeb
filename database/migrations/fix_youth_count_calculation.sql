-- =============================================================================
-- Fix Youth Count Calculation in calculate_batch_statistics Function
-- =============================================================================
-- Purpose: Replace hardcoded youth count with actual calculation based on target age range
-- Version: 1.0
-- Date: 2024
-- =============================================================================

-- Drop and recreate the calculate_batch_statistics function with proper youth count calculation
CREATE OR REPLACE FUNCTION calculate_batch_statistics(batch_id_param VARCHAR(20))
RETURNS TABLE(
    total_responses INTEGER,
    validated_responses INTEGER,
    rejected_responses INTEGER,
    pending_responses INTEGER,
    total_youths INTEGER,
    total_youths_surveyed INTEGER,
    total_youths_not_surveyed INTEGER,
    response_rate DECIMAL(5,2),
    validation_rate DECIMAL(5,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(COUNT(ksr.response_id), 0)::INTEGER as total_responses,
        COALESCE(COUNT(ksr.response_id) FILTER (WHERE ksr.validation_status = 'validated'), 0)::INTEGER as validated_responses,
        COALESCE(COUNT(ksr.response_id) FILTER (WHERE ksr.validation_status = 'rejected'), 0)::INTEGER as rejected_responses,
        COALESCE(COUNT(ksr.response_id) FILTER (WHERE ksr.validation_status = 'pending'), 0)::INTEGER as pending_responses,
        -- Calculate actual total youths based on target age range from the batch
        (SELECT COUNT(*) FROM "Youth_Profiling" yp, "KK_Survey_Batches" kb 
         WHERE kb.batch_id = batch_id_param 
         AND yp.age BETWEEN kb.target_age_min AND kb.target_age_max 
         AND yp.is_active = true)::INTEGER as total_youths,
        COALESCE(COUNT(DISTINCT ksr.youth_id), 0)::INTEGER as total_youths_surveyed,
        -- Calculate actual not surveyed (total youths - surveyed youths)
        ((SELECT COUNT(*) FROM "Youth_Profiling" yp, "KK_Survey_Batches" kb 
          WHERE kb.batch_id = batch_id_param 
          AND yp.age BETWEEN kb.target_age_min AND kb.target_age_max 
          AND yp.is_active = true) - COUNT(DISTINCT ksr.youth_id))::INTEGER as total_youths_not_surveyed,
        -- Calculate response rate based on actual youth count
        CASE 
            WHEN (SELECT COUNT(*) FROM "Youth_Profiling" yp, "KK_Survey_Batches" kb 
                  WHERE kb.batch_id = batch_id_param 
                  AND yp.age BETWEEN kb.target_age_min AND kb.target_age_max 
                  AND yp.is_active = true) > 0 
            THEN ROUND((COUNT(ksr.response_id)::DECIMAL / 
                (SELECT COUNT(*) FROM "Youth_Profiling" yp, "KK_Survey_Batches" kb 
                 WHERE kb.batch_id = batch_id_param 
                 AND yp.age BETWEEN kb.target_age_min AND kb.target_age_max 
                 AND yp.is_active = true)) * 100, 2)
            ELSE 0.00
        END as response_rate,
        -- Calculate validation rate (validated responses / total responses)
        CASE 
            WHEN COUNT(ksr.response_id) > 0 THEN ROUND((COUNT(ksr.response_id) FILTER (WHERE ksr.validation_status = 'validated')::DECIMAL / COUNT(ksr.response_id)) * 100, 2)
            ELSE 0.00
        END as validation_rate
    FROM "KK_Survey_Responses" ksr
    WHERE ksr.batch_id = batch_id_param;
END;
$$ LANGUAGE plpgsql;

-- Add comment for documentation
COMMENT ON FUNCTION calculate_batch_statistics(VARCHAR) IS 'Calculates comprehensive statistics for a specific batch using real youth data based on target age range.';

-- =============================================================================
-- Migration completed
-- =============================================================================

SELECT 'Youth count calculation fixed successfully!' as status;
