-- Migration: Remove extra fields from LYDO_Council_Members table
-- This removes the columns that were added: focus, description, photo_url_1/2/3, term_start/end, sort_order

-- Drop the index first (if it exists)
DROP INDEX IF EXISTS idx_council_members_sort;

-- Remove the extra columns
ALTER TABLE "LYDO_Council_Members"
DROP COLUMN IF EXISTS focus,
DROP COLUMN IF EXISTS description,
DROP COLUMN IF EXISTS photo_url_1,
DROP COLUMN IF EXISTS photo_url_2,
DROP COLUMN IF EXISTS photo_url_3,
DROP COLUMN IF EXISTS term_start,
DROP COLUMN IF EXISTS term_end,
DROP COLUMN IF EXISTS sort_order;



