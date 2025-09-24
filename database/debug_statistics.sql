-- =============================================================================
-- Debug Statistics - Check what's happening
-- =============================================================================

-- Check 1: See if Voters_List has any data
SELECT 'Voters_List Data Check:' as check_type;
SELECT COUNT(*) as total_voters FROM "Voters_List";
SELECT COUNT(*) as san_jose_voters FROM "Voters_List" WHERE municipality = 'San Jose';
SELECT COUNT(*) as age_15_30_voters FROM "Voters_List" 
WHERE municipality = 'San Jose' 
  AND (EXTRACT(YEAR FROM CURRENT_DATE) - EXTRACT(YEAR FROM birth_date)) BETWEEN 15 AND 30;

-- Check 2: See if there are any survey responses
SELECT 'Survey Responses Check:' as check_type;
SELECT COUNT(*) as total_responses FROM "KK_Survey_Responses";
SELECT batch_id, COUNT(*) as response_count 
FROM "KK_Survey_Responses" 
GROUP BY batch_id;

-- Check 3: Test the calculate_batch_statistics function directly
SELECT 'Function Test:' as check_type;
SELECT * FROM calculate_batch_statistics('BAT001');
SELECT * FROM calculate_batch_statistics('BAT002');
SELECT * FROM calculate_batch_statistics('BAT003');

-- Check 4: Check what the active_batches_with_stats view returns
SELECT 'View Test:' as check_type;
SELECT batch_id, batch_name, status, total_responses, total_youths, response_rate 
FROM active_batches_with_stats 
LIMIT 5;

-- Check 5: Sample voter data (if any exists)
SELECT 'Sample Voter Data:' as check_type;
SELECT voter_id, first_name, last_name, birth_date, 
       (EXTRACT(YEAR FROM CURRENT_DATE) - EXTRACT(YEAR FROM birth_date)) as age,
       municipality
FROM "Voters_List" 
LIMIT 5;
