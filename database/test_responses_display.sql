-- Test to verify response statistics are working
-- This will help us see if the calculate_batch_statistics function returns correct data

-- First, let's check what responses exist
SELECT 'Current Survey Responses:' as test;
SELECT 
    batch_id,
    COUNT(*) as total_responses,
    COUNT(*) FILTER (WHERE validation_status = 'validated') as validated,
    COUNT(*) FILTER (WHERE validation_status = 'pending') as pending,
    COUNT(*) FILTER (WHERE validation_status = 'rejected') as rejected
FROM "KK_Survey_Responses" 
GROUP BY batch_id
ORDER BY batch_id;

-- Test the calculate_batch_statistics function
SELECT 'Function Test Results:' as test;
SELECT 
    'BAT001' as batch_id,
    * 
FROM calculate_batch_statistics('BAT001');

SELECT 
    'BAT004' as batch_id,
    * 
FROM calculate_batch_statistics('BAT004');

-- Test what the backend query would return
SELECT 'Backend Query Simulation:' as test;
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
