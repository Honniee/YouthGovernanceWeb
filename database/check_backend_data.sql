-- Check what the backend is actually receiving
SELECT 'Backend Data Check:' as check_name;

-- Check what the active_batches_with_stats view returns (this is what backend uses)
SELECT 
    batch_id,
    batch_name,
    status,
    total_responses,
    total_youths,
    response_rate,
    validated_responses
FROM active_batches_with_stats 
WHERE batch_id = 'BAT001';

-- Also check if the view is using the updated function
SELECT 'View definition check:' as check_name;
SELECT definition 
FROM pg_views 
WHERE viewname = 'active_batches_with_stats';

