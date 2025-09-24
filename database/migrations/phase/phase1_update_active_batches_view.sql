-- =============================================================================
-- Phase 1.6: Update active_batches_with_stats View
-- =============================================================================
-- Purpose: Update the view to use new statistics from calculate_batch_statistics function
-- Version: 1.0
-- Date: 2024
-- =============================================================================

-- Drop the existing view
DROP VIEW IF EXISTS active_batches_with_stats;

-- Recreate the view with new statistics structure
CREATE OR REPLACE VIEW active_batches_with_stats AS
SELECT 
    kb.*,
    -- Response statistics
    stats.total_responses,
    stats.validated_responses,
    stats.rejected_responses,
    stats.pending_responses,
    
    -- Population statistics
    stats.total_eligible_voters,
    
    -- Rate calculations
    stats.response_rate,
    stats.validation_rate,
    
    -- Validation tier breakdown
    stats.automatic_validations,
    stats.manual_validations,
    stats.final_reviews,
    
    -- Time-based calculations
    CASE 
        WHEN kb.status = 'active' THEN (kb.end_date - CURRENT_DATE)
        ELSE NULL
    END as days_remaining,
    
    CASE 
        WHEN kb.status = 'active' AND CURRENT_DATE > kb.end_date THEN true
        ELSE false
    END as is_overdue,
    
    -- Additional calculated fields
    CASE 
        WHEN stats.total_eligible_voters > 0 THEN 
            (stats.total_eligible_voters - stats.validated_responses)
        ELSE 0
    END as youths_not_surveyed,
    
    CASE 
        WHEN stats.total_responses > 0 THEN 
            ROUND((stats.automatic_validations::DECIMAL / stats.total_responses) * 100, 2)
        ELSE 0.00
    END as automatic_validation_rate,
    
    CASE 
        WHEN stats.total_responses > 0 THEN 
            ROUND((stats.manual_validations::DECIMAL / stats.total_responses) * 100, 2)
        ELSE 0.00
    END as manual_validation_rate

FROM "KK_Survey_Batches" kb
LEFT JOIN LATERAL calculate_batch_statistics(kb.batch_id) stats ON true
WHERE kb.status IN ('active', 'draft');

-- Add comment for documentation
COMMENT ON VIEW active_batches_with_stats IS 'Active and draft batches with real-time calculated statistics based on voter list validation. Includes response rates, validation breakdown, and time-based metrics.';

-- =============================================================================
-- Migration completed
-- =============================================================================

SELECT 'active_batches_with_stats view updated successfully!' as status;
