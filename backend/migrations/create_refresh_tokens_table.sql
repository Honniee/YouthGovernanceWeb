-- Migration: Create Refresh_Tokens table for secure token storage
-- This table stores refresh tokens for the httpOnly cookie implementation

CREATE TABLE IF NOT EXISTS "Refresh_Tokens" (
    token_hash VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    user_type VARCHAR(20) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP NULL,
    
    -- Composite unique constraint to allow one active refresh token per user
    CONSTRAINT unique_user_refresh_token UNIQUE (user_id, user_type)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON "Refresh_Tokens"(user_id, user_type);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON "Refresh_Tokens"(expires_at);

-- Cleanup expired tokens (can be run periodically)
-- DELETE FROM "Refresh_Tokens" WHERE expires_at < NOW();

COMMENT ON TABLE "Refresh_Tokens" IS 'Stores refresh tokens for secure httpOnly cookie authentication';
COMMENT ON COLUMN "Refresh_Tokens".token_hash IS 'SHA-256 hash of the refresh token (never store plain tokens)';
COMMENT ON COLUMN "Refresh_Tokens".user_id IS 'ID of the user (can be lydo_id, sk_id, or youth_id)';
COMMENT ON COLUMN "Refresh_Tokens".user_type IS 'Type of user: admin, lydo_staff, sk_official, or youth';
COMMENT ON COLUMN "Refresh_Tokens".expires_at IS 'Token expiration timestamp';
COMMENT ON COLUMN "Refresh_Tokens".revoked_at IS 'Timestamp when token was revoked (if revoked before expiration)';

