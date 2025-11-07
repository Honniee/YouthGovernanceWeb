-- Create table for Municipal/City SK Federation officers selected from SK_Officials

 CREATE TABLE IF NOT EXISTS "SK_Federation_Officers" (
  federation_officer_id SERIAL PRIMARY KEY,

  -- Federation is per SK term
  term_id VARCHAR(20) NOT NULL REFERENCES "SK_Terms"(term_id) ON UPDATE CASCADE ON DELETE CASCADE,

  -- Link to the chosen SK official (chairperson/councilor) record
  official_id VARCHAR(20) NOT NULL REFERENCES "SK_Officials"(sk_id) ON UPDATE CASCADE ON DELETE RESTRICT,

  -- Canonical position within the federation
  position TEXT NOT NULL,

  -- Optional ordering for display in UI
  display_order SMALLINT NOT NULL DEFAULT 0,

  -- Status flags
  is_active BOOLEAN NOT NULL DEFAULT TRUE,

  -- Audit fields
  created_by VARCHAR(20) NULL REFERENCES "Users"(user_id) ON UPDATE CASCADE ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by VARCHAR(20) NULL REFERENCES "Users"(user_id) ON UPDATE CASCADE ON DELETE SET NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

 -- Limit positions to the official list provided (idempotent)
DO $$
BEGIN
  -- Only proceed if the table exists (avoid to_regclass error on fresh runs)
  IF to_regclass('public.SK_Federation_Officers') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'sk_fed_officers_position_check'
        AND conrelid = to_regclass('public.SK_Federation_Officers')
    ) THEN
      EXECUTE 'ALTER TABLE "SK_Federation_Officers"\n'
        || '  ADD CONSTRAINT sk_fed_officers_position_check\n'
        || '  CHECK (position = ANY (ARRAY['''
        || 'President'', ''Vice President'', ''Secretary'', ''Treasurer'', ''Auditor'', ''PRO'', ''Sergeant-at-Arms'
        || ''']))';
    END IF;
  END IF;
END$$;

-- Ensure one position per term (no duplicates for the same term)
CREATE UNIQUE INDEX IF NOT EXISTS sk_fed_officers_term_position_uidx
  ON "SK_Federation_Officers" (term_id, position);

-- Prevent assigning the same official to multiple federation positions in the same term
CREATE UNIQUE INDEX IF NOT EXISTS sk_fed_officers_term_official_uidx
  ON "SK_Federation_Officers" (term_id, official_id);

-- Helpful index for listing officers of a term in display order
CREATE INDEX IF NOT EXISTS sk_fed_officers_term_order_idx
  ON "SK_Federation_Officers" (term_id, display_order);


