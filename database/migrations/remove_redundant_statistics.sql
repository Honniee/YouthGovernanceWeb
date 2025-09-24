-- =============================================================================
-- Remove Redundant Statistics Columns Migration
-- =============================================================================
-- Purpose: Remove stored statistics columns since we use real-time calculation
-- Version: 1.0
-- Date: 2024
-- =============================================================================

-- First, drop the dependent view
DROP VIEW IF EXISTS active_batches_with_stats;

-- Remove redundant statistics columns from KK_Survey_Batches
-- These are no longer needed since we use calculate_batch_statistics() function
ALTER TABLE "KK_Survey_Batches" DROP COLUMN IF EXISTS statistics_total_responses;
ALTER TABLE "KK_Survey_Batches" DROP COLUMN IF EXISTS statistics_validated_responses;
ALTER TABLE "KK_Survey_Batches" DROP COLUMN IF EXISTS statistics_rejected_responses;
ALTER TABLE "KK_Survey_Batches" DROP COLUMN IF EXISTS statistics_pending_responses;
ALTER TABLE "KK_Survey_Batches" DROP COLUMN IF EXISTS statistics_total_youths;
ALTER TABLE "KK_Survey_Batches" DROP COLUMN IF EXISTS statistics_total_youths_not_surveyed;

-- Recreate the view without the stored statistics columns
-- Now it will use the calculate_batch_statistics() function for real-time data
CREATE OR REPLACE VIEW active_batches_with_stats AS
SELECT 
    kb.*,
    stats.total_responses,
    stats.validated_responses,
    stats.rejected_responses,
    stats.pending_responses,
    stats.total_youths,
    stats.total_youths_surveyed,
    stats.total_youths_not_surveyed,
    stats.response_rate,
    stats.validation_rate,
    -- Calculate days remaining
    CASE 
        WHEN kb.status = 'active' THEN (kb.end_date - CURRENT_DATE)
        ELSE NULL
    END as days_remaining,
    -- Check if overdue
    CASE 
        WHEN kb.status = 'active' AND CURRENT_DATE > kb.end_date THEN true
        ELSE false
    END as is_overdue
FROM "KK_Survey_Batches" kb
LEFT JOIN LATERAL calculate_batch_statistics(kb.batch_id) stats ON true
WHERE kb.status IN ('active', 'draft');

-- Add comment for documentation
COMMENT ON TABLE "KK_Survey_Batches" IS 'Survey batches table. Statistics are calculated in real-time using calculate_batch_statistics() function.';
COMMENT ON VIEW active_batches_with_stats IS 'Active and draft batches with real-time calculated statistics and time-based flags.';

-- =============================================================================
-- Migration completed
-- =============================================================================

SELECT 'Redundant statistics columns removed and view updated successfully!' as status;