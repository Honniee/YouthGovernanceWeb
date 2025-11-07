-- Ensure SK_Terms.term_id is unique so it can be referenced by foreign keys
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'sk_terms_term_id_uidx'
  ) THEN
    -- Create a unique index on term_id (works whether or not it's already PK)
    EXECUTE 'CREATE UNIQUE INDEX sk_terms_term_id_uidx ON "SK_Terms" (term_id)';
  END IF;
END$$;



