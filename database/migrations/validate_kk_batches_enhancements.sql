-- =============================================================================
-- KK Survey Batches Database Enhancements Validation Script
-- =============================================================================
-- Purpose: Validate that all enhancements were applied correctly
-- Run this after applying the main migration
-- =============================================================================

-- Check if new columns were added
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'KK_Survey_Batches' 
AND column_name IN ('paused_at', 'paused_by', 'paused_reason', 'resumed_at', 'resumed_by')
ORDER BY column_name;

-- Check if indexes were created
SELECT 
    indexname, 
    indexdef
FROM pg_indexes 
WHERE tablename = 'KK_Survey_Batches'
AND indexname LIKE 'idx_kk_batches_%'
ORDER BY indexname;

-- Check if foreign key constraints were added
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name = 'KK_Survey_Batches'
AND tc.constraint_name LIKE 'fk_kk_batches_%'
ORDER BY tc.constraint_name;

-- Check if functions were created
SELECT 
    routine_name,
    routine_type,
    data_type as return_type
FROM information_schema.routines
WHERE routine_name IN (
    'check_active_kk_survey',
    'check_batch_date_conflicts',
    'get_batches_needing_status_update',
    'calculate_batch_statistics',
    'update_batch_pause_timestamps'
)
ORDER BY routine_name;

-- Check if views were created
SELECT 
    table_name,
    view_definition
FROM information_schema.views
WHERE table_name IN ('active_batches_with_stats', 'batch_audit_trail')
ORDER BY table_name;

-- Check if trigger was created
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers
WHERE trigger_name = 'trigger_batch_pause_timestamps';

-- =============================================================================
-- Test the new functions with sample data
-- =============================================================================

-- Test: Check active KK survey function
SELECT 'Testing check_active_kk_survey function:' as test_name;
SELECT * FROM check_active_kk_survey();

-- Test: Check date conflicts function (using sample dates)
SELECT 'Testing check_batch_date_conflicts function:' as test_name;
SELECT * FROM check_batch_date_conflicts('2024-01-01', '2024-01-31');

-- Test: Check batches needing status update
SELECT 'Testing get_batches_needing_status_update function:' as test_name;
SELECT * FROM get_batches_needing_status_update();

-- Test: Check statistics calculation (will work once we have data)
SELECT 'Testing calculate_batch_statistics function structure:' as test_name;
-- This will return empty results but validates the function works
SELECT * FROM calculate_batch_statistics('BAT001') LIMIT 1;

-- Test: Check views
SELECT 'Testing active_batches_with_stats view:' as test_name;
SELECT batch_id, batch_name, status, days_remaining, is_overdue 
FROM active_batches_with_stats 
LIMIT 5;

SELECT 'Testing batch_audit_trail view:' as test_name;
SELECT batch_id, batch_name, status, created_by_name, paused_by_name 
FROM batch_audit_trail 
LIMIT 5;

-- =============================================================================
-- Performance test queries
-- =============================================================================

-- Test index performance for common queries
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM "KK_Survey_Batches" WHERE status = 'active';

EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM "KK_Survey_Batches" 
WHERE status = 'active' AND start_date <= CURRENT_DATE AND end_date >= CURRENT_DATE;

-- =============================================================================
-- Validation Summary
-- =============================================================================

SELECT 'Database enhancement validation completed successfully!' as status;
