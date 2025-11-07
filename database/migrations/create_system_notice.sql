-- Create System_Notice table (single-row settings table)
CREATE TABLE IF NOT EXISTS "System_Notice" (
  id SMALLINT PRIMARY KEY DEFAULT 1,
  enabled BOOLEAN NOT NULL DEFAULT false,
  dismissible BOOLEAN NOT NULL DEFAULT true,
  type TEXT NOT NULL DEFAULT 'info',
  text TEXT NOT NULL DEFAULT '',
  expires_at TIMESTAMP NULL,
  created_by VARCHAR(20) NULL REFERENCES "Users"(user_id) ON UPDATE CASCADE ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by VARCHAR(20) NULL REFERENCES "Users"(user_id) ON UPDATE CASCADE ON DELETE SET NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO "System_Notice" (id, enabled, dismissible, type, text, created_by)
VALUES (1, false, true, 'info', '', NULL)
ON CONFLICT (id) DO NOTHING;


