-- Check if the calculate_batch_statistics function exists
SELECT 'Checking if function exists...' as status;

-- Check function definition
SELECT 
    routine_name,
    routine_type,
    data_type as return_type
FROM information_schema.routines 
WHERE routine_name = 'calculate_batch_statistics' 
AND routine_schema = 'public';

-- If function doesn't exist, create it
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
        -- Response counts
        COALESCE(COUNT(ksr.response_id), 0)::INTEGER as total_responses,
        COALESCE(COUNT(ksr.response_id) FILTER (WHERE ksr.validation_status = 'validated'), 0)::INTEGER as validated_responses,
        COALESCE(COUNT(ksr.response_id) FILTER (WHERE ksr.validation_status = 'rejected'), 0)::INTEGER as rejected_responses,
        COALESCE(COUNT(ksr.response_id) FILTER (WHERE ksr.validation_status = 'pending'), 0)::INTEGER as pending_responses,
        
        -- Total youth count (ages 15-30)
        (SELECT COUNT(*) FROM "Voters_List" vl 
         WHERE (EXTRACT(YEAR FROM CURRENT_DATE) - EXTRACT(YEAR FROM vl.birth_date)) BETWEEN 15 AND 30)::INTEGER as total_youths,
        
        -- Surveyed count
        COALESCE(COUNT(DISTINCT ksr.youth_id), 0)::INTEGER as total_youths_surveyed,
        
        -- Not surveyed count
        ((SELECT COUNT(*) FROM "Voters_List" vl 
          WHERE (EXTRACT(YEAR FROM CURRENT_DATE) - EXTRACT(YEAR FROM vl.birth_date)) BETWEEN 15 AND 30) - 
         COUNT(DISTINCT ksr.youth_id))::INTEGER as total_youths_not_surveyed,
        
        -- Response rate
        CASE 
            WHEN (SELECT COUNT(*) FROM "Voters_List" vl 
                  WHERE (EXTRACT(YEAR FROM CURRENT_DATE) - EXTRACT(YEAR FROM vl.birth_date)) BETWEEN 15 AND 30) > 0 
            THEN ROUND((COUNT(ksr.response_id)::DECIMAL / 
                (SELECT COUNT(*) FROM "Voters_List" vl 
                 WHERE (EXTRACT(YEAR FROM CURRENT_DATE) - EXTRACT(YEAR FROM vl.birth_date)) BETWEEN 15 AND 30)) * 100, 2)
            ELSE 0.00
        END as response_rate,
        
        -- Validation rate
        CASE 
            WHEN COUNT(ksr.response_id) > 0 THEN ROUND((COUNT(ksr.response_id) FILTER (WHERE ksr.validation_status = 'validated')::DECIMAL / COUNT(ksr.response_id)) * 100, 2)
            ELSE 0.00
        END as validation_rate
        
    FROM "KK_Survey_Responses" ksr
    WHERE ksr.batch_id = batch_id_param;
END;
$$ LANGUAGE plpgsql;

SELECT 'Function created/updated successfully!' as status;
