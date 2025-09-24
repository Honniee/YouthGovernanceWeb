-- Verify what the backend should be receiving
-- This simulates exactly what the backend query does

-- Test the exact backend query
SELECT 
    kb.batch_id,
    kb.batch_name,
    kb.status,
    kb.start_date,
    kb.end_date,
    kb.created_at,
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
ORDER BY kb.batch_id;

-- Also test individual function calls
SELECT 'Individual function tests:' as test;
SELECT 'BAT001:' as batch, * FROM calculate_batch_statistics('BAT001');
SELECT 'BAT004:' as batch, * FROM calculate_batch_statistics('BAT004');
