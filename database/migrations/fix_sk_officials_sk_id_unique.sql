-- Ensure SK_Officials.sk_id is unique so it can be referenced by foreign keys
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'sk_officials_sk_id_uidx'
  ) THEN
    EXECUTE 'CREATE UNIQUE INDEX sk_officials_sk_id_uidx ON "SK_Officials" (sk_id)';
  END IF;
END$$;



