-- Test the calculate_batch_statistics function directly
SELECT 'Testing calculate_batch_statistics function:' as test_name;

-- Test with a specific batch ID
SELECT * FROM calculate_batch_statistics('BAT001');

-- Also test with any batch that has responses
SELECT 
    batch_id,
    COUNT(*) as response_count
FROM "KK_Survey_Responses" 
GROUP BY batch_id 
ORDER BY response_count DESC 
LIMIT 3;

-- Test the function with the batch that has the most responses
-- (Replace 'BAT001' with the actual batch ID from above)
SELECT 'Testing with batch that has responses:' as test_name;
SELECT * FROM calculate_batch_statistics('BAT001'); -- Change this to the actual batch ID
