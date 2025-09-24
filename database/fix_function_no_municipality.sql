-- =============================================================================
-- Fix calculate_batch_statistics function to work without municipality column
-- =============================================================================

-- Update the function to work with existing Voters_List structure
CREATE OR REPLACE FUNCTION calculate_batch_statistics(batch_id_param VARCHAR(20))
RETURNS TABLE(
    total_responses INTEGER,
    validated_responses INTEGER,
    rejected_responses INTEGER,
    pending_responses INTEGER,
    total_youths INTEGER,                    -- FIXED: Use real voter count
    total_youths_surveyed INTEGER,           -- FIXED: Use real surveyed count
    total_youths_not_surveyed INTEGER,       -- FIXED: Use real calculation
    response_rate DECIMAL(5,2),              -- FIXED: Based on real data
    validation_rate DECIMAL(5,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        -- Response counts (same as before)
        COALESCE(COUNT(ksr.response_id), 0)::INTEGER as total_responses,
        COALESCE(COUNT(ksr.response_id) FILTER (WHERE ksr.validation_status = 'validated'), 0)::INTEGER as validated_responses,
        COALESCE(COUNT(ksr.response_id) FILTER (WHERE ksr.validation_status = 'rejected'), 0)::INTEGER as rejected_responses,
        COALESCE(COUNT(ksr.response_id) FILTER (WHERE ksr.validation_status = 'pending'), 0)::INTEGER as pending_responses,
        
        -- FIXED: Use real voter count (ages 15-30, no municipality filter)
        (SELECT COUNT(*) FROM "Voters_List" vl 
         WHERE (EXTRACT(YEAR FROM CURRENT_DATE) - EXTRACT(YEAR FROM vl.birth_date)) BETWEEN 15 AND 30)::INTEGER as total_youths,
        
        -- FIXED: Use real surveyed count
        COALESCE(COUNT(DISTINCT ksr.youth_id), 0)::INTEGER as total_youths_surveyed,
        
        -- FIXED: Calculate real not surveyed count
        ((SELECT COUNT(*) FROM "Voters_List" vl 
          WHERE (EXTRACT(YEAR FROM CURRENT_DATE) - EXTRACT(YEAR FROM vl.birth_date)) BETWEEN 15 AND 30) - 
         COUNT(DISTINCT ksr.youth_id))::INTEGER as total_youths_not_surveyed,
        
        -- FIXED: Response rate based on real data
        CASE 
            WHEN (SELECT COUNT(*) FROM "Voters_List" vl 
                  WHERE (EXTRACT(YEAR FROM CURRENT_DATE) - EXTRACT(YEAR FROM vl.birth_date)) BETWEEN 15 AND 30) > 0 
            THEN ROUND((COUNT(ksr.response_id)::DECIMAL / 
                (SELECT COUNT(*) FROM "Voters_List" vl 
                 WHERE (EXTRACT(YEAR FROM CURRENT_DATE) - EXTRACT(YEAR FROM vl.birth_date)) BETWEEN 15 AND 30)) * 100, 2)
            ELSE 0.00
        END as response_rate,
        
        -- Validation rate (same as before)
        CASE 
            WHEN COUNT(ksr.response_id) > 0 THEN ROUND((COUNT(ksr.response_id) FILTER (WHERE ksr.validation_status = 'validated')::DECIMAL / COUNT(ksr.response_id)) * 100, 2)
            ELSE 0.00
        END as validation_rate
        
    FROM "KK_Survey_Responses" ksr
    WHERE ksr.batch_id = batch_id_param;
END;
$$ LANGUAGE plpgsql;

-- Test the function
SELECT 'Testing fixed function:' as test_name;
SELECT * FROM calculate_batch_statistics('BAT001');

SELECT 'Function fixed successfully!' as status;
