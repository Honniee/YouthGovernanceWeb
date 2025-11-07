-- Migration: Add missing fields to LYDO_Council_Members table
-- This adds the fields needed by the frontend to properly display council members

-- Add missing columns to LYDO_Council_Members
ALTER TABLE "LYDO_Council_Members"
ADD COLUMN IF NOT EXISTS focus VARCHAR(100),
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS photo_url_1 TEXT,
ADD COLUMN IF NOT EXISTS photo_url_2 TEXT,
ADD COLUMN IF NOT EXISTS photo_url_3 TEXT,
ADD COLUMN IF NOT EXISTS term_start DATE,
ADD COLUMN IF NOT EXISTS term_end DATE,
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Add index for sort_order to improve query performance
CREATE INDEX IF NOT EXISTS idx_council_members_sort ON "LYDO_Council_Members" (sort_order);

-- Add comment to explain the table structure
COMMENT ON TABLE "LYDO_Council_Members" IS 'Stores council members with their assigned roles and additional display information';
COMMENT ON COLUMN "LYDO_Council_Members".focus IS 'Advocacy area or focus (e.g., Education, Health, Environment)';
COMMENT ON COLUMN "LYDO_Council_Members".description IS 'Brief description of the member role and responsibilities';
COMMENT ON COLUMN "LYDO_Council_Members".sort_order IS 'Display order within role group (lower numbers appear first)';

