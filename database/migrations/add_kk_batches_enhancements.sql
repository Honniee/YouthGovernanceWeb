-- =============================================================================
-- KK Survey Batches Database Enhancements Migration
-- =============================================================================
-- Purpose: Add audit fields for pause/resume functionality and performance optimizations
-- Version: 1.0
-- Date: 2024
-- =============================================================================

-- Add audit fields for pause/resume functionality
-- These fields track when and why a batch was paused/resumed
ALTER TABLE "KK_Survey_Batches" ADD COLUMN paused_at TIMESTAMP NULL;
ALTER TABLE "KK_Survey_Batches" ADD COLUMN paused_by VARCHAR(20) NULL;
ALTER TABLE "KK_Survey_Batches" ADD COLUMN paused_reason TEXT NULL;
ALTER TABLE "KK_Survey_Batches" ADD COLUMN resumed_at TIMESTAMP NULL;
ALTER TABLE "KK_Survey_Batches" ADD COLUMN resumed_by VARCHAR(20) NULL;

-- Add foreign key constraints for audit tracking
ALTER TABLE "KK_Survey_Batches" 
ADD CONSTRAINT fk_kk_batches_paused_by 
FOREIGN KEY (paused_by) REFERENCES "LYDO"(lydo_id) ON DELETE SET NULL;

ALTER TABLE "KK_Survey_Batches" 
ADD CONSTRAINT fk_kk_batches_resumed_by 
FOREIGN KEY (resumed_by) REFERENCES "LYDO"(lydo_id) ON DELETE SET NULL;

-- Add performance indexes
CREATE INDEX idx_kk_batches_status ON "KK_Survey_Batches" (status);
CREATE INDEX idx_kk_batches_status_dates ON "KK_Survey_Batches" (status, start_date, end_date);
CREATE INDEX idx_kk_batches_active_status ON "KK_Survey_Batches" (status) WHERE status = 'active';

-- Add composite index for common queries (status + dates)
CREATE INDEX idx_kk_batches_status_created ON "KK_Survey_Batches" (status, created_at DESC);

-- =============================================================================
-- Create stored procedures for business logic
-- =============================================================================

-- Function to check if there's already an active KK survey
CREATE OR REPLACE FUNCTION check_active_kk_survey(excluding_batch_id VARCHAR(20) DEFAULT NULL)
RETURNS TABLE(batch_id VARCHAR(20), batch_name VARCHAR(100)) AS $$
BEGIN
    RETURN QUERY
    SELECT kb.batch_id, kb.batch_name
    FROM "KK_Survey_Batches" kb
    WHERE kb.status = 'active'
    AND (excluding_batch_id IS NULL OR kb.batch_id != excluding_batch_id);
END;
$$ LANGUAGE plpgsql;

-- Function to check date conflicts with existing batches
CREATE OR REPLACE FUNCTION check_batch_date_conflicts(
    start_date_param DATE,
    end_date_param DATE,
    excluding_batch_id VARCHAR(20) DEFAULT NULL
)
RETURNS TABLE(batch_id VARCHAR(20), batch_name VARCHAR(100), start_date DATE, end_date DATE, status TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT kb.batch_id, kb.batch_name, kb.start_date, kb.end_date, kb.status
    FROM "KK_Survey_Batches" kb
    WHERE kb.status != 'closed'
    AND (excluding_batch_id IS NULL OR kb.batch_id != excluding_batch_id)
    AND (
        -- New batch starts during existing batch
        (start_date_param BETWEEN kb.start_date AND kb.end_date)
        OR
        -- New batch ends during existing batch
        (end_date_param BETWEEN kb.start_date AND kb.end_date)
        OR
        -- New batch completely encompasses existing batch
        (start_date_param <= kb.start_date AND end_date_param >= kb.end_date)
    );
END;
$$ LANGUAGE plpgsql;

-- Function to get batches that need auto status updates
CREATE OR REPLACE FUNCTION get_batches_needing_status_update()
RETURNS TABLE(
    batch_id VARCHAR(20), 
    batch_name VARCHAR(100), 
    current_status TEXT, 
    suggested_status TEXT,
    reason TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        kb.batch_id,
        kb.batch_name,
        kb.status as current_status,
        CASE 
            WHEN kb.status = 'draft' AND CURRENT_DATE >= kb.start_date AND CURRENT_DATE <= kb.end_date THEN 'active'
            WHEN kb.status = 'active' AND CURRENT_DATE > kb.end_date THEN 'closed'
            ELSE kb.status
        END as suggested_status,
        CASE 
            WHEN kb.status = 'draft' AND CURRENT_DATE >= kb.start_date AND CURRENT_DATE <= kb.end_date 
                THEN 'Start date reached'
            WHEN kb.status = 'active' AND CURRENT_DATE > kb.end_date 
                THEN 'End date passed'
            ELSE 'No change needed'
        END as reason
    FROM "KK_Survey_Batches" kb
    WHERE (
        (kb.status = 'draft' AND CURRENT_DATE >= kb.start_date AND CURRENT_DATE <= kb.end_date)
        OR
        (kb.status = 'active' AND CURRENT_DATE > kb.end_date)
    );
END;
$$ LANGUAGE plpgsql;

-- Function to calculate batch statistics
CREATE OR REPLACE FUNCTION calculate_batch_statistics(batch_id_param VARCHAR(20))
RETURNS TABLE(
    total_responses INTEGER,
    validated_responses INTEGER,
    rejected_responses INTEGER,
    pending_responses INTEGER,
    total_youths INTEGER,
    total_youths_surveyed INTEGER,
    total_youths_not_surveyed INTEGER,
    response_rate DECIMAL(5,2),
    validation_rate DECIMAL(5,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(COUNT(ksr.response_id), 0)::INTEGER as total_responses,
        COALESCE(COUNT(ksr.response_id) FILTER (WHERE ksr.validation_status = 'validated'), 0)::INTEGER as validated_responses,
        COALESCE(COUNT(ksr.response_id) FILTER (WHERE ksr.validation_status = 'rejected'), 0)::INTEGER as rejected_responses,
        COALESCE(COUNT(ksr.response_id) FILTER (WHERE ksr.validation_status = 'pending'), 0)::INTEGER as pending_responses,
        -- For now, we'll use a placeholder for total youths - this would need to be calculated based on your youth data
        COALESCE(1000, 0)::INTEGER as total_youths, -- Placeholder
        COALESCE(COUNT(DISTINCT ksr.youth_id), 0)::INTEGER as total_youths_surveyed,
        COALESCE(1000 - COUNT(DISTINCT ksr.youth_id), 0)::INTEGER as total_youths_not_surveyed, -- Placeholder calculation
        CASE 
            WHEN 1000 > 0 THEN ROUND((COUNT(ksr.response_id)::DECIMAL / 1000) * 100, 2)
            ELSE 0.00
        END as response_rate,
        CASE 
            WHEN COUNT(ksr.response_id) > 0 THEN ROUND((COUNT(ksr.response_id) FILTER (WHERE ksr.validation_status = 'validated')::DECIMAL / COUNT(ksr.response_id)) * 100, 2)
            ELSE 0.00
        END as validation_rate
    FROM "KK_Survey_Responses" ksr
    WHERE ksr.batch_id = batch_id_param;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Create triggers for automatic timestamp updates
-- =============================================================================

-- Trigger to automatically update paused_at when status changes to paused
CREATE OR REPLACE FUNCTION update_batch_pause_timestamps()
RETURNS TRIGGER AS $$
BEGIN
    -- If status changed to paused and paused_at is not set
    IF NEW.status = 'active' AND OLD.status != 'active' AND NEW.paused_at IS NOT NULL THEN
        -- This is a resume action, set resumed_at
        NEW.resumed_at = CURRENT_TIMESTAMP;
        NEW.paused_at = NULL;
        NEW.paused_reason = NULL;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the trigger
CREATE TRIGGER trigger_batch_pause_timestamps
    BEFORE UPDATE ON "KK_Survey_Batches"
    FOR EACH ROW
    EXECUTE FUNCTION update_batch_pause_timestamps();

-- =============================================================================
-- Create views for common queries
-- =============================================================================

-- View for active batches with calculated statistics
CREATE OR REPLACE VIEW active_batches_with_stats AS
SELECT 
    kb.*,
    stats.total_responses,
    stats.validated_responses,
    stats.rejected_responses,
    stats.pending_responses,
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

-- View for batch audit trail
CREATE OR REPLACE VIEW batch_audit_trail AS
SELECT 
    kb.batch_id,
    kb.batch_name,
    kb.status,
    kb.created_at,
    kb.updated_at,
    kb.paused_at,
    kb.paused_by,
    kb.paused_reason,
    kb.resumed_at,
    kb.resumed_by,
    CONCAT(
        creator.first_name,
        CASE WHEN creator.middle_name IS NOT NULL THEN CONCAT(' ', creator.middle_name) ELSE '' END,
        ' ', creator.last_name,
        CASE WHEN creator.suffix IS NOT NULL THEN CONCAT(' ', creator.suffix) ELSE '' END
    ) as created_by_name,
    CONCAT(
        pauser.first_name,
        CASE WHEN pauser.middle_name IS NOT NULL THEN CONCAT(' ', pauser.middle_name) ELSE '' END,
        ' ', pauser.last_name,
        CASE WHEN pauser.suffix IS NOT NULL THEN CONCAT(' ', pauser.suffix) ELSE '' END
    ) as paused_by_name,
    CONCAT(
        resumer.first_name,
        CASE WHEN resumer.middle_name IS NOT NULL THEN CONCAT(' ', resumer.middle_name) ELSE '' END,
        ' ', resumer.last_name,
        CASE WHEN resumer.suffix IS NOT NULL THEN CONCAT(' ', resumer.suffix) ELSE '' END
    ) as resumed_by_name
FROM "KK_Survey_Batches" kb
LEFT JOIN "LYDO" creator ON kb.created_by = creator.lydo_id
LEFT JOIN "LYDO" pauser ON kb.paused_by = pauser.lydo_id
LEFT JOIN "LYDO" resumer ON kb.resumed_by = resumer.lydo_id;

-- =============================================================================
-- Add comments for documentation
-- =============================================================================

COMMENT ON COLUMN "KK_Survey_Batches".paused_at IS 'Timestamp when the batch was paused for maintenance';
COMMENT ON COLUMN "KK_Survey_Batches".paused_by IS 'LYDO ID of the user who paused the batch';
COMMENT ON COLUMN "KK_Survey_Batches".paused_reason IS 'Reason provided for pausing the batch';
COMMENT ON COLUMN "KK_Survey_Batches".resumed_at IS 'Timestamp when the batch was resumed from pause';
COMMENT ON COLUMN "KK_Survey_Batches".resumed_by IS 'LYDO ID of the user who resumed the batch';

COMMENT ON FUNCTION check_active_kk_survey(VARCHAR) IS 'Returns any active KK survey batches, optionally excluding a specific batch ID';
COMMENT ON FUNCTION check_batch_date_conflicts(DATE, DATE, VARCHAR) IS 'Returns batches that have date conflicts with the provided date range';
COMMENT ON FUNCTION get_batches_needing_status_update() IS 'Returns batches that need automatic status updates based on current date';
COMMENT ON FUNCTION calculate_batch_statistics(VARCHAR) IS 'Calculates comprehensive statistics for a specific batch';

COMMENT ON VIEW active_batches_with_stats IS 'Active and draft batches with calculated statistics and time-based flags';
COMMENT ON VIEW batch_audit_trail IS 'Audit trail view showing who created, paused, and resumed batches';

-- =============================================================================
-- End of migration
-- =============================================================================
