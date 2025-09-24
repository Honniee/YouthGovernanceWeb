-- =============================================================================
-- Phase 1.3: Create Youth Participation Tracking Table
-- =============================================================================
-- Purpose: Track youth participation across multiple survey batches
-- Version: 1.0
-- Date: 2024
-- =============================================================================

-- Create Youth_Participation_Tracking table
CREATE TABLE IF NOT EXISTS "Youth_Participation_Tracking" (
    tracking_id VARCHAR(20) PRIMARY KEY,
    voter_id VARCHAR(20) NOT NULL, -- Reference to Voters_List
    batch_id VARCHAR(20) NOT NULL,
    response_id VARCHAR(20) NOT NULL,
    participation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    validation_status TEXT CHECK (validation_status IN ('pending', 'validated', 'rejected')) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    FOREIGN KEY (voter_id) REFERENCES "Voters_List"(voter_id) ON DELETE CASCADE,
    FOREIGN KEY (batch_id) REFERENCES "KK_Survey_Batches"(batch_id) ON DELETE CASCADE,
    FOREIGN KEY (response_id) REFERENCES "KK_Survey_Responses"(response_id) ON DELETE CASCADE,
    
    -- Unique constraint to prevent duplicate participation per batch
    UNIQUE(voter_id, batch_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_youth_participation_voter_id ON "Youth_Participation_Tracking" (voter_id);
CREATE INDEX IF NOT EXISTS idx_youth_participation_batch_id ON "Youth_Participation_Tracking" (batch_id);
CREATE INDEX IF NOT EXISTS idx_youth_participation_response_id ON "Youth_Participation_Tracking" (response_id);
CREATE INDEX IF NOT EXISTS idx_youth_participation_validation_status ON "Youth_Participation_Tracking" (validation_status);
CREATE INDEX IF NOT EXISTS idx_youth_participation_date ON "Youth_Participation_Tracking" (participation_date);

-- Add composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_youth_participation_voter_batch ON "Youth_Participation_Tracking" (voter_id, batch_id);
CREATE INDEX IF NOT EXISTS idx_youth_participation_batch_status ON "Youth_Participation_Tracking" (batch_id, validation_status);

-- Add comments for documentation
COMMENT ON TABLE "Youth_Participation_Tracking" IS 'Tracks youth participation across multiple survey batches to prevent duplicates and monitor engagement';
COMMENT ON COLUMN "Youth_Participation_Tracking".tracking_id IS 'Unique identifier for participation record';
COMMENT ON COLUMN "Youth_Participation_Tracking".voter_id IS 'Reference to voter in Voters_List table';
COMMENT ON COLUMN "Youth_Participation_Tracking".batch_id IS 'Reference to survey batch';
COMMENT ON COLUMN "Youth_Participation_Tracking".response_id IS 'Reference to survey response';
COMMENT ON COLUMN "Youth_Participation_Tracking".participation_date IS 'When the youth participated in the survey';
COMMENT ON COLUMN "Youth_Participation_Tracking".validation_status IS 'Current validation status of the participation';
COMMENT ON COLUMN "Youth_Participation_Tracking".created_at IS 'When the tracking record was created';
COMMENT ON COLUMN "Youth_Participation_Tracking".updated_at IS 'When the tracking record was last updated';

-- =============================================================================
-- Migration completed
-- =============================================================================

SELECT 'Youth_Participation_Tracking table created successfully!' as status;
