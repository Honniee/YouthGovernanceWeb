-- Test script to check survey response data
-- This will help us understand what response data exists

-- 1. Check if there are any survey responses
SELECT 'Survey Responses Count' as test, COUNT(*) as count FROM "KK_Survey_Responses";

-- 2. Check responses by batch
SELECT 
    'Responses by Batch' as test,
    batch_id,
    COUNT(*) as total_responses,
    COUNT(*) FILTER (WHERE validation_status = 'validated') as validated,
    COUNT(*) FILTER (WHERE validation_status = 'pending') as pending,
    COUNT(*) FILTER (WHERE validation_status = 'rejected') as rejected
FROM "KK_Survey_Responses" 
GROUP BY batch_id
ORDER BY batch_id;

-- 3. Check if there are any voters in the age range
SELECT 
    'Voters in Age Range' as test,
    COUNT(*) as total_voters,
    COUNT(*) FILTER (WHERE EXTRACT(YEAR FROM AGE(CURRENT_DATE, birth_date)) BETWEEN 15 AND 30) as youth_voters
FROM "Voters_List";

-- 4. Test the calculate_batch_statistics function for each batch
SELECT 
    'Batch Statistics Test' as test,
    batch_id,
    batch_name,
    status
FROM "KK_Survey_Batches"
ORDER BY batch_id;

-- 5. Test the function for a specific batch (if any exist)
DO $$
DECLARE
    batch_record RECORD;
BEGIN
    FOR batch_record IN SELECT batch_id FROM "KK_Survey_Batches" LIMIT 1
    LOOP
        RAISE NOTICE 'Testing calculate_batch_statistics for batch: %', batch_record.batch_id;
        PERFORM * FROM calculate_batch_statistics(batch_record.batch_id);
    END LOOP;
END $$;

