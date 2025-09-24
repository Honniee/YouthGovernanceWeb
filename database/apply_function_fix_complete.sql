-- Complete fix for the calculate_batch_statistics function
-- This ensures the function works correctly and returns proper data

-- First drop the view that depends on the function
DROP VIEW IF EXISTS active_batches_with_stats CASCADE;

-- Now drop and recreate the function
DROP FUNCTION IF EXISTS calculate_batch_statistics(VARCHAR(20));

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
        -- Response counts from KK_Survey_Responses
        COALESCE(COUNT(ksr.response_id), 0)::INTEGER as total_responses,
        COALESCE(COUNT(ksr.response_id) FILTER (WHERE ksr.validation_status = 'validated'), 0)::INTEGER as validated_responses,
        COALESCE(COUNT(ksr.response_id) FILTER (WHERE ksr.validation_status = 'rejected'), 0)::INTEGER as rejected_responses,
        COALESCE(COUNT(ksr.response_id) FILTER (WHERE ksr.validation_status = 'pending'), 0)::INTEGER as pending_responses,
        
        -- Total youth count from Voters_List (ages 15-30)
        (SELECT COUNT(*) FROM "Voters_List" vl 
         WHERE (EXTRACT(YEAR FROM CURRENT_DATE) - EXTRACT(YEAR FROM vl.birth_date)) BETWEEN 15 AND 30)::INTEGER as total_youths,
        
        -- Surveyed count (unique youth who responded)
        COALESCE(COUNT(DISTINCT ksr.youth_id), 0)::INTEGER as total_youths_surveyed,
        
        -- Not surveyed count
        ((SELECT COUNT(*) FROM "Voters_List" vl 
          WHERE (EXTRACT(YEAR FROM CURRENT_DATE) - EXTRACT(YEAR FROM vl.birth_date)) BETWEEN 15 AND 30) - 
         COUNT(DISTINCT ksr.youth_id))::INTEGER as total_youths_not_surveyed,
        
        -- Response rate (total responses / total youth population)
        CASE 
            WHEN (SELECT COUNT(*) FROM "Voters_List" vl 
                  WHERE (EXTRACT(YEAR FROM CURRENT_DATE) - EXTRACT(YEAR FROM vl.birth_date)) BETWEEN 15 AND 30) > 0 
            THEN ROUND((COUNT(ksr.response_id)::DECIMAL / 
                (SELECT COUNT(*) FROM "Voters_List" vl 
                 WHERE (EXTRACT(YEAR FROM CURRENT_DATE) - EXTRACT(YEAR FROM vl.birth_date)) BETWEEN 15 AND 30)) * 100, 2)
            ELSE 0.00
        END as response_rate,
        
        -- Validation rate (validated responses / total responses)
        CASE 
            WHEN COUNT(ksr.response_id) > 0 THEN ROUND((COUNT(ksr.response_id) FILTER (WHERE ksr.validation_status = 'validated')::DECIMAL / COUNT(ksr.response_id)) * 100, 2)
            ELSE 0.00
        END as validation_rate
        
    FROM "KK_Survey_Responses" ksr
    WHERE ksr.batch_id = batch_id_param;
END;
$$ LANGUAGE plpgsql;

-- Test the function
SELECT 'Function created successfully!' as status;

-- Test with BAT001
SELECT 'Testing BAT001:' as test;
SELECT * FROM calculate_batch_statistics('BAT001');

-- Test with BAT004
SELECT 'Testing BAT004:' as test;
SELECT * FROM calculate_batch_statistics('BAT004');

-- Test the complete backend query
SELECT 'Backend Query Test:' as test;
SELECT 
    kb.batch_id,
    kb.batch_name,
    kb.status,
    stats.total_responses,
    stats.validated_responses,
    stats.rejected_responses,
    stats.pending_responses,
    stats.total_youths,
    stats.response_rate,
    stats.validation_rate
FROM "KK_Survey_Batches" kb
LEFT JOIN LATERAL calculate_batch_statistics(kb.batch_id) stats ON true
ORDER BY kb.batch_id;

-- Recreate the view
CREATE OR REPLACE VIEW active_batches_with_stats AS
SELECT 
    kb.*,
    stats.total_responses,
    stats.validated_responses,
    stats.rejected_responses,
    stats.pending_responses,
    stats.total_youths,
    stats.total_youths_surveyed,
    stats.total_youths_not_surveyed,
    stats.response_rate,
    stats.validation_rate,
    CASE 
        WHEN kb.status = 'active' THEN (kb.end_date - CURRENT_DATE)
        ELSE NULL
    END as days_remaining,
    CASE 
        WHEN kb.status = 'active' AND CURRENT_DATE > kb.end_date THEN true
        ELSE false
    END as is_overdue
FROM "KK_Survey_Batches" kb
LEFT JOIN LATERAL calculate_batch_statistics(kb.batch_id) stats ON true
WHERE kb.status IN ('active', 'draft');

SELECT 'Function and view recreated successfully!' as final_status;
