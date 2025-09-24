-- =============================================================================
-- Fix Missing Columns in Voters_List
-- =============================================================================

-- Check what columns exist in Voters_List
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'Voters_List' 
ORDER BY column_name;

-- Add the missing municipality column
ALTER TABLE "Voters_List" ADD COLUMN IF NOT EXISTS
    municipality VARCHAR(50) DEFAULT 'San Jose';

-- Add other missing columns if needed
ALTER TABLE "Voters_List" ADD COLUMN IF NOT EXISTS
    province VARCHAR(50) DEFAULT 'Batangas';

ALTER TABLE "Voters_List" ADD COLUMN IF NOT EXISTS
    region VARCHAR(50) DEFAULT 'Region IV-A (CALABARZON)';

ALTER TABLE "Voters_List" ADD COLUMN IF NOT EXISTS
    is_active BOOLEAN DEFAULT TRUE;

-- Update existing records to have default values
UPDATE "Voters_List" 
SET 
    municipality = 'San Jose',
    province = 'Batangas',
    region = 'Region IV-A (CALABARZON)',
    is_active = TRUE
WHERE municipality IS NULL OR province IS NULL OR region IS NULL OR is_active IS NULL;

-- Verify the columns were added
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_name = 'Voters_List' 
  AND column_name IN ('municipality', 'province', 'region', 'is_active')
ORDER BY column_name;

SELECT 'Columns added successfully!' as status;
