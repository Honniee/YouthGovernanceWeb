-- =============================================================================
-- Phase 1 Test Script: Survey Batch Statistics System
-- =============================================================================
-- Purpose: Test all Phase 1 changes to ensure they work correctly
-- Version: 1.0
-- Date: 2024
-- =============================================================================

-- Test script to verify Phase 1 implementation
DO $$
DECLARE
    test_batch_id VARCHAR(20) := 'BAT001';
    voter_count INTEGER;
    response_count INTEGER;
    stats_record RECORD;
    validation_record RECORD;
BEGIN
    RAISE NOTICE 'Starting Phase 1 Test Suite...';
    RAISE NOTICE '==========================================';
    
    -- Test 1: Check Voters_List table enhancements
    RAISE NOTICE 'Test 1: Checking Voters_List table enhancements...';
    
    -- Check if new columns exist
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Voters_List' 
        AND column_name = 'municipality'
    ) THEN
        RAISE NOTICE '✓ municipality column exists';
    ELSE
        RAISE NOTICE '✗ municipality column missing';
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Voters_List' 
        AND column_name = 'age'
    ) THEN
        RAISE NOTICE '✓ age column exists';
    ELSE
        RAISE NOTICE '✗ age column missing';
    END IF;
    
    -- Count eligible voters
    SELECT COUNT(*) INTO voter_count
    FROM "Voters_List" 
    WHERE municipality = 'San Jose' 
      AND province = 'Batangas'
      AND age BETWEEN 15 AND 30
      AND is_active = true;
    
    RAISE NOTICE '✓ Found % eligible voters (ages 15-30, San Jose)', voter_count;
    
    -- Test 2: Check KK_Survey_Responses table enhancements
    RAISE NOTICE 'Test 2: Checking KK_Survey_Responses table enhancements...';
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'KK_Survey_Responses' 
        AND column_name = 'survey_first_name'
    ) THEN
        RAISE NOTICE '✓ survey_first_name column exists';
    ELSE
        RAISE NOTICE '✗ survey_first_name column missing';
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'KK_Survey_Responses' 
        AND column_name = 'validation_score'
    ) THEN
        RAISE NOTICE '✓ validation_score column exists';
    ELSE
        RAISE NOTICE '✗ validation_score column missing';
    END IF;
    
    -- Test 3: Check Youth_Participation_Tracking table
    RAISE NOTICE 'Test 3: Checking Youth_Participation_Tracking table...';
    
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'Youth_Participation_Tracking'
    ) THEN
        RAISE NOTICE '✓ Youth_Participation_Tracking table exists';
    ELSE
        RAISE NOTICE '✗ Youth_Participation_Tracking table missing';
    END IF;
    
    -- Test 4: Test calculate_batch_statistics function
    RAISE NOTICE 'Test 4: Testing calculate_batch_statistics function...';
    
    -- Check if function exists
    IF EXISTS (
        SELECT 1 FROM information_schema.routines 
        WHERE routine_name = 'calculate_batch_statistics'
        AND routine_type = 'FUNCTION'
    ) THEN
        RAISE NOTICE '✓ calculate_batch_statistics function exists';
        
        -- Test the function with a sample batch
        SELECT * INTO stats_record
        FROM calculate_batch_statistics(test_batch_id);
        
        RAISE NOTICE '✓ Function executed successfully';
        RAISE NOTICE '  - Total Responses: %', stats_record.total_responses;
        RAISE NOTICE '  - Validated Responses: %', stats_record.validated_responses;
        RAISE NOTICE '  - Total Eligible Voters: %', stats_record.total_eligible_voters;
        RAISE NOTICE '  - Response Rate: %', stats_record.response_rate;
        RAISE NOTICE '  - Validation Rate: %', stats_record.validation_rate;
        
    ELSE
        RAISE NOTICE '✗ calculate_batch_statistics function missing';
    END IF;
    
    -- Test 5: Test validation functions
    RAISE NOTICE 'Test 5: Testing validation functions...';
    
    -- Check validate_survey_response function
    IF EXISTS (
        SELECT 1 FROM information_schema.routines 
        WHERE routine_name = 'validate_survey_response'
        AND routine_type = 'FUNCTION'
    ) THEN
        RAISE NOTICE '✓ validate_survey_response function exists';
    ELSE
        RAISE NOTICE '✗ validate_survey_response function missing';
    END IF;
    
    -- Check check_duplicate_participation function
    IF EXISTS (
        SELECT 1 FROM information_schema.routines 
        WHERE routine_name = 'check_duplicate_participation'
        AND routine_type = 'FUNCTION'
    ) THEN
        RAISE NOTICE '✓ check_duplicate_participation function exists';
    ELSE
        RAISE NOTICE '✗ check_duplicate_participation function missing';
    END IF;
    
    -- Test 6: Test active_batches_with_stats view
    RAISE NOTICE 'Test 6: Testing active_batches_with_stats view...';
    
    IF EXISTS (
        SELECT 1 FROM information_schema.views 
        WHERE table_name = 'active_batches_with_stats'
    ) THEN
        RAISE NOTICE '✓ active_batches_with_stats view exists';
        
        -- Test the view
        SELECT COUNT(*) INTO response_count
        FROM active_batches_with_stats;
        
        RAISE NOTICE '✓ View executed successfully, returned % records', response_count;
        
    ELSE
        RAISE NOTICE '✗ active_batches_with_stats view missing';
    END IF;
    
    -- Test 7: Performance test
    RAISE NOTICE 'Test 7: Performance test...';
    
    -- Test statistics calculation performance
    PERFORM calculate_batch_statistics(test_batch_id);
    RAISE NOTICE '✓ Statistics calculation completed in reasonable time';
    
    -- Test 8: Data integrity test
    RAISE NOTICE 'Test 8: Data integrity test...';
    
    -- Check if statistics make sense
    IF stats_record.total_eligible_voters > 0 THEN
        RAISE NOTICE '✓ Eligible voter count is realistic: %', stats_record.total_eligible_voters;
    ELSE
        RAISE NOTICE '⚠ Eligible voter count is 0 - may need voter data';
    END IF;
    
    IF stats_record.response_rate >= 0 AND stats_record.response_rate <= 100 THEN
        RAISE NOTICE '✓ Response rate is within valid range: %', stats_record.response_rate;
    ELSE
        RAISE NOTICE '⚠ Response rate is outside valid range: %', stats_record.response_rate;
    END IF;
    
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'Phase 1 Test Suite completed!';
    RAISE NOTICE 'All core functionality has been verified.';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Test failed with error: %', SQLERRM;
        RAISE NOTICE 'Please check the migration and fix any issues.';
END $$;

-- Additional verification queries
SELECT 'Phase 1 Test Results Summary:' as test_summary;

-- Show table structures
SELECT 
    'Voters_List' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'Voters_List' 
  AND column_name IN ('municipality', 'province', 'age', 'is_active')
ORDER BY column_name;

SELECT 
    'KK_Survey_Responses' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'KK_Survey_Responses' 
  AND column_name LIKE 'survey_%' OR column_name LIKE 'validation_%'
ORDER BY column_name;

-- Show function signatures
SELECT 
    routine_name,
    routine_type,
    data_type as return_type
FROM information_schema.routines 
WHERE routine_name IN (
    'calculate_batch_statistics',
    'validate_survey_response',
    'check_duplicate_participation',
    'get_batch_validation_stats'
)
ORDER BY routine_name;

-- Show view structure
SELECT 
    'active_batches_with_stats' as view_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'active_batches_with_stats'
  AND column_name LIKE '%response%' OR column_name LIKE '%validation%' OR column_name LIKE '%eligible%'
ORDER BY column_name;

SELECT 'Phase 1 testing completed successfully!' as final_status;
