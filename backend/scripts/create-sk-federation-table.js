// Node script to create the SK_Federation_Officers table safely (idempotent)
// Usage: node backend/scripts/create-sk-federation-table.js

import pkg from 'pg';
import dotenv from 'dotenv';
dotenv.config();
const { Pool } = pkg;

const connectionString = process.env.DATABASE_URL || 
  `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;

// Local script pool: disable SSL to support local Postgres
const pool = new Pool({ connectionString, ssl: false });

async function getClient() {
  return await pool.connect();
}

async function run() {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Ensure unique keys exist on referenced tables
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS sk_terms_term_id_uidx
      ON "SK_Terms"(term_id);
    `);

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS sk_officials_sk_id_uidx
      ON "SK_Officials"(sk_id);
    `);

    // Create the federation table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "SK_Federation_Officers" (
        federation_officer_id SERIAL PRIMARY KEY,
        term_id VARCHAR(20) NOT NULL REFERENCES "SK_Terms"(term_id) ON UPDATE CASCADE ON DELETE CASCADE,
        official_id VARCHAR(20) NOT NULL REFERENCES "SK_Officials"(sk_id) ON UPDATE CASCADE ON DELETE RESTRICT,
        position TEXT NOT NULL,
        display_order SMALLINT NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_by VARCHAR(20) NULL REFERENCES "Users"(user_id) ON UPDATE CASCADE ON DELETE SET NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_by VARCHAR(20) NULL REFERENCES "Users"(user_id) ON UPDATE CASCADE ON DELETE SET NULL,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Add the CHECK constraint if missing
    await client.query(`
      DO $$
      BEGIN
        IF to_regclass('public.SK_Federation_Officers') IS NOT NULL THEN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = 'sk_fed_officers_position_check'
              AND conrelid = to_regclass('public.SK_Federation_Officers')
          ) THEN
            ALTER TABLE "SK_Federation_Officers"
              ADD CONSTRAINT sk_fed_officers_position_check
              CHECK (position = ANY (ARRAY[
                'President',
                'Vice President',
                'Secretary',
                'Treasurer',
                'Auditor',
                'PRO',
                'Sergeant-at-Arms'
              ]));
          END IF;
        END IF;
      END$$;
    `);

    // Unique constraints and helpful indexes
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS sk_fed_officers_term_position_uidx
        ON "SK_Federation_Officers" (term_id, position);
    `);

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS sk_fed_officers_term_official_uidx
        ON "SK_Federation_Officers" (term_id, official_id);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS sk_fed_officers_term_order_idx
        ON "SK_Federation_Officers" (term_id, display_order);
    `);

    await client.query('COMMIT');
    console.log('✅ SK_Federation_Officers table is ready.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Failed to create SK_Federation_Officers table:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
  }
}

run();


