-- Test the exact query that the backend should be running
-- This will show us what data the backend should be returning

-- Test the exact backend query with includeStats=true
SELECT 
    kb.batch_id,
    kb.batch_name,
    kb.description,
    kb.start_date,
    kb.end_date,
    kb.status,
    kb.target_age_min,
    kb.target_age_max,
    kb.created_by,
    kb.created_at,
    kb.updated_at,
    kb.paused_at,
    kb.paused_by,
    kb.paused_reason,
    kb.resumed_at,
    kb.resumed_by,
    stats.total_responses,
    stats.validated_responses,
    stats.rejected_responses,
    stats.pending_responses,
    stats.total_youths,
    stats.total_youths_surveyed,
    stats.total_youths_not_surveyed,
    stats.response_rate,
    stats.validation_rate,
    -- Calculate days remaining for active batches
    CASE 
        WHEN kb.status = 'active' THEN (kb.end_date - CURRENT_DATE)
        ELSE NULL
    END as days_remaining,
    -- Check if overdue for active batches
    CASE 
        WHEN kb.status = 'active' AND CURRENT_DATE > kb.end_date THEN true
        ELSE false
    END as is_overdue
FROM "KK_Survey_Batches" kb
LEFT JOIN LATERAL calculate_batch_statistics(kb.batch_id) stats ON true
ORDER BY kb.created_at DESC;

-- Also test what happens when we call the function directly
SELECT 'Direct function calls:' as test;
SELECT 'BAT001 function result:' as batch, * FROM calculate_batch_statistics('BAT001');
SELECT 'BAT004 function result:' as batch, * FROM calculate_batch_statistics('BAT004');
