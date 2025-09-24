-- Test the fixed calculate_batch_statistics function
-- This will verify that the function now returns correct response data

-- Test the function for each batch
SELECT 
    'Testing Fixed Function' as test,
    batch_id,
    batch_name,
    status
FROM "KK_Survey_Batches"
ORDER BY batch_id;

-- Test the function for each batch and show results
DO $$
DECLARE
    batch_record RECORD;
    stats_record RECORD;
BEGIN
    FOR batch_record IN SELECT batch_id, batch_name FROM "KK_Survey_Batches" ORDER BY batch_id
    LOOP
        RAISE NOTICE '=== Testing batch: % (%) ===', batch_record.batch_name, batch_record.batch_id;
        
        -- Test the function
        FOR stats_record IN SELECT * FROM calculate_batch_statistics(batch_record.batch_id)
        LOOP
            RAISE NOTICE 'Total Responses: %', stats_record.total_responses;
            RAISE NOTICE 'Validated: %', stats_record.validated_responses;
            RAISE NOTICE 'Pending: %', stats_record.pending_responses;
            RAISE NOTICE 'Rejected: %', stats_record.rejected_responses;
            RAISE NOTICE 'Total Youths: %', stats_record.total_youths;
            RAISE NOTICE 'Response Rate: %', stats_record.response_rate;
            RAISE NOTICE 'Validation Rate: %', stats_record.validation_rate;
            RAISE NOTICE '---';
        END LOOP;
    END LOOP;
END $$;

-- Test the view that the backend uses
SELECT 
    'Active Batches View Test' as test,
    batch_id,
    batch_name,
    status,
    total_responses,
    validated_responses,
    pending_responses,
    total_youths,
    response_rate
FROM active_batches_with_stats
ORDER BY batch_id;

