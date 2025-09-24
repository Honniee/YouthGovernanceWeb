-- Migration: Add audit fields to SK_Terms table
-- This adds fields for tracking status changes, completion details, and audit trail

-- Add audit fields to SK_Terms table
ALTER TABLE "SK_Terms" 
ADD COLUMN completion_type TEXT CHECK (completion_type IN ('automatic', 'forced', 'manual')) DEFAULT NULL,
ADD COLUMN completed_by VARCHAR(20) DEFAULT NULL,
ADD COLUMN completed_at TIMESTAMP DEFAULT NULL,
ADD COLUMN last_status_change_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN last_status_change_by VARCHAR(20) DEFAULT NULL,
ADD COLUMN status_change_reason TEXT DEFAULT NULL;

-- Add foreign key for completed_by
ALTER TABLE "SK_Terms" 
ADD CONSTRAINT fk_sk_terms_completed_by 
FOREIGN KEY (completed_by) REFERENCES "LYDO"(lydo_id) ON DELETE SET NULL;

-- Add foreign key for last_status_change_by
ALTER TABLE "SK_Terms" 
ADD CONSTRAINT fk_sk_terms_status_change_by 
FOREIGN KEY (last_status_change_by) REFERENCES "LYDO"(lydo_id) ON DELETE SET NULL;

-- Add index for completion tracking
CREATE INDEX idx_sk_terms_completion ON "SK_Terms" (completion_type, completed_at);

-- Add index for status change tracking
CREATE INDEX idx_sk_terms_status_changes ON "SK_Terms" (last_status_change_at, last_status_change_by);

-- Add account access field to SK_Officials table
ALTER TABLE "SK_Officials" 
ADD COLUMN account_access BOOLEAN DEFAULT TRUE,
ADD COLUMN account_access_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN account_access_updated_by VARCHAR(20) DEFAULT NULL;

-- Add foreign key for account_access_updated_by
ALTER TABLE "SK_Officials" 
ADD CONSTRAINT fk_sk_officials_account_access_by 
FOREIGN KEY (account_access_updated_by) REFERENCES "LYDO"(lydo_id) ON DELETE SET NULL;

-- Add index for account access tracking
CREATE INDEX idx_sk_officials_account_access ON "SK_Officials" (account_access, account_access_updated_at);
