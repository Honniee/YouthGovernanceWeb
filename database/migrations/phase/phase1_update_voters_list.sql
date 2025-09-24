-- =============================================================================
-- Phase 1.1: Update Voters_List Table for Survey Validation
-- =============================================================================
-- Purpose: Add missing fields for better voter matching and age calculation
-- Version: 1.0
-- Date: 2024
-- =============================================================================

-- Add missing fields for better matching
ALTER TABLE "Voters_List" ADD COLUMN IF NOT EXISTS
    municipality VARCHAR(50) DEFAULT 'San Jose',
    province VARCHAR(50) DEFAULT 'Batangas',
    region VARCHAR(50) DEFAULT 'Region IV-A (CALABARZON)',
    is_active BOOLEAN DEFAULT TRUE;

-- Add computed age column (automatically calculated from birth_date)
ALTER TABLE "Voters_List" ADD COLUMN IF NOT EXISTS
    age INTEGER GENERATED ALWAYS AS (EXTRACT(YEAR FROM CURRENT_DATE) - EXTRACT(YEAR FROM birth_date)) STORED;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_voters_list_municipality ON "Voters_List" (municipality);
CREATE INDEX IF NOT EXISTS idx_voters_list_province ON "Voters_List" (province);
CREATE INDEX IF NOT EXISTS idx_voters_list_age ON "Voters_List" (age);
CREATE INDEX IF NOT EXISTS idx_voters_list_active ON "Voters_List" (is_active);

-- Add composite index for common queries
CREATE INDEX IF NOT EXISTS idx_voters_list_location_age_active ON "Voters_List" (municipality, province, age, is_active);

-- Update existing records to have default values
UPDATE "Voters_List" 
SET 
    municipality = 'San Jose',
    province = 'Batangas',
    region = 'Region IV-A (CALABARZON)',
    is_active = TRUE
WHERE municipality IS NULL OR province IS NULL OR region IS NULL OR is_active IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN "Voters_List".municipality IS 'Municipality where the voter is registered (default: San Jose)';
COMMENT ON COLUMN "Voters_List".province IS 'Province where the voter is registered (default: Batangas)';
COMMENT ON COLUMN "Voters_List".region IS 'Region where the voter is registered (default: Region IV-A CALABARZON)';
COMMENT ON COLUMN "Voters_List".is_active IS 'Whether the voter record is active and valid';
COMMENT ON COLUMN "Voters_List".age IS 'Computed age based on birth_date (automatically calculated)';

-- =============================================================================
-- Migration completed
-- =============================================================================

SELECT 'Voters_List table updated successfully!' as status;
