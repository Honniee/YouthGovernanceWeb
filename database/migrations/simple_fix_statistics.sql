-- =============================================================================
-- SIMPLE FIX: Survey Batch Statistics
-- =============================================================================
-- Purpose: Fix the hardcoded 1000 youth count with real voter data
-- =============================================================================

-- Step 1: Add age calculation to Voters_List (if not exists)
-- Note: We'll calculate age in the function instead of storing it

-- Step 2: Add municipality field (if not exists)
ALTER TABLE "Voters_List" ADD COLUMN IF NOT EXISTS
    municipality VARCHAR(50) DEFAULT 'San Jose';

-- Step 3: Fix the calculate_batch_statistics function
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
        
        -- FIXED: Use real voter count instead of hardcoded 1000
        (SELECT COUNT(*) FROM "Voters_List" vl 
         WHERE vl.municipality = 'San Jose' 
           AND (EXTRACT(YEAR FROM CURRENT_DATE) - EXTRACT(YEAR FROM vl.birth_date)) BETWEEN 15 AND 30)::INTEGER as total_youths,
        
        -- FIXED: Use real surveyed count
        COALESCE(COUNT(DISTINCT ksr.youth_id), 0)::INTEGER as total_youths_surveyed,
        
        -- FIXED: Calculate real not surveyed count
        ((SELECT COUNT(*) FROM "Voters_List" vl 
          WHERE vl.municipality = 'San Jose' 
            AND (EXTRACT(YEAR FROM CURRENT_DATE) - EXTRACT(YEAR FROM vl.birth_date)) BETWEEN 15 AND 30) - 
         COUNT(DISTINCT ksr.youth_id))::INTEGER as total_youths_not_surveyed,
        
        -- FIXED: Response rate based on real data
        CASE 
            WHEN (SELECT COUNT(*) FROM "Voters_List" vl 
                  WHERE vl.municipality = 'San Jose' 
                    AND (EXTRACT(YEAR FROM CURRENT_DATE) - EXTRACT(YEAR FROM vl.birth_date)) BETWEEN 15 AND 30) > 0 
            THEN ROUND((COUNT(ksr.response_id)::DECIMAL / 
                (SELECT COUNT(*) FROM "Voters_List" vl 
                 WHERE vl.municipality = 'San Jose' 
                   AND (EXTRACT(YEAR FROM CURRENT_DATE) - EXTRACT(YEAR FROM vl.birth_date)) BETWEEN 15 AND 30)) * 100, 2)
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

-- Step 4: Update the view to use new function
DROP VIEW IF EXISTS active_batches_with_stats;

CREATE OR REPLACE VIEW active_batches_with_stats AS
SELECT 
    kb.*,
    stats.total_responses,
    stats.validated_responses,
    stats.rejected_responses,
    stats.pending_responses,
    stats.total_youths,                    -- FIXED: Real voter count
    stats.total_youths_surveyed,           -- FIXED: Real surveyed count
    stats.total_youths_not_surveyed,       -- FIXED: Real not surveyed count
    stats.response_rate,                   -- FIXED: Real response rate
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

SELECT 'Statistics fixed! Now using real voter data instead of hardcoded 1000.' as status;
