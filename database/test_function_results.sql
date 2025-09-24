-- Test what the function actually returns
SELECT 'Function Results Test:' as test_name;

-- Test with a specific batch
SELECT * FROM calculate_batch_statistics('BAT001');

-- Also check what batches exist and have responses
SELECT 
    ksr.batch_id,
    kb.batch_name,
    COUNT(*) as response_count
FROM "KK_Survey_Responses" ksr
JOIN "KK_Survey_Batches" kb ON ksr.batch_id = kb.batch_id
GROUP BY ksr.batch_id, kb.batch_name
ORDER BY response_count DESC;

-- Test the function with the batch that has the most responses
-- (Use the batch_id from the results above)
SELECT 'Testing with batch that has responses:' as test_name;
-- Replace 'BAT001' with the actual batch ID that has responses
SELECT * FROM calculate_batch_statistics('BAT001');
