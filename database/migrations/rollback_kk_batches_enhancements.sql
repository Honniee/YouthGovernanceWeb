-- =============================================================================
-- KK Survey Batches Database Enhancements Rollback Script
-- =============================================================================
-- Purpose: Rollback all enhancements if needed
-- WARNING: This will remove all pause/resume audit data!
-- =============================================================================

-- Drop views first (they depend on the table)
DROP VIEW IF EXISTS active_batches_with_stats;
DROP VIEW IF EXISTS batch_audit_trail;

-- Drop trigger
DROP TRIGGER IF EXISTS trigger_batch_pause_timestamps ON "KK_Survey_Batches";

-- Drop trigger function
DROP FUNCTION IF EXISTS update_batch_pause_timestamps();

-- Drop utility functions
DROP FUNCTION IF EXISTS check_active_kk_survey(VARCHAR);
DROP FUNCTION IF EXISTS check_batch_date_conflicts(DATE, DATE, VARCHAR);
DROP FUNCTION IF EXISTS get_batches_needing_status_update();
DROP FUNCTION IF EXISTS calculate_batch_statistics(VARCHAR);

-- Drop indexes (in reverse order of creation)
DROP INDEX IF EXISTS idx_kk_batches_status_created;
DROP INDEX IF EXISTS idx_kk_batches_active_status;
DROP INDEX IF EXISTS idx_kk_batches_status_dates;
DROP INDEX IF EXISTS idx_kk_batches_status;

-- Drop foreign key constraints
ALTER TABLE "KK_Survey_Batches" DROP CONSTRAINT IF EXISTS fk_kk_batches_resumed_by;
ALTER TABLE "KK_Survey_Batches" DROP CONSTRAINT IF EXISTS fk_kk_batches_paused_by;

-- Drop columns (WARNING: This will lose all pause/resume data!)
ALTER TABLE "KK_Survey_Batches" DROP COLUMN IF EXISTS resumed_by;
ALTER TABLE "KK_Survey_Batches" DROP COLUMN IF EXISTS resumed_at;
ALTER TABLE "KK_Survey_Batches" DROP COLUMN IF EXISTS paused_reason;
ALTER TABLE "KK_Survey_Batches" DROP COLUMN IF EXISTS paused_by;
ALTER TABLE "KK_Survey_Batches" DROP COLUMN IF EXISTS paused_at;

-- =============================================================================
-- Rollback completed
-- =============================================================================

SELECT 'Database enhancements rollback completed!' as status;



