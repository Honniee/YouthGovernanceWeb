-- Migration: Create Password_Reset_Tokens table for secure password recovery
-- This table stores password reset tokens for the forgot password feature

CREATE TABLE IF NOT EXISTS "Password_Reset_Tokens" (
    token_hash VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    user_type VARCHAR(20) NOT NULL,
    email VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    used_at TIMESTAMP NULL
);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_reset_tokens_user ON "Password_Reset_Tokens"(user_id, user_type);
CREATE INDEX IF NOT EXISTS idx_reset_tokens_email ON "Password_Reset_Tokens"(email);
CREATE INDEX IF NOT EXISTS idx_reset_tokens_expires ON "Password_Reset_Tokens"(expires_at);

-- Cleanup expired tokens (can be run periodically)
-- DELETE FROM "Password_Reset_Tokens" WHERE expires_at < NOW();

COMMENT ON TABLE "Password_Reset_Tokens" IS 'Stores password reset tokens for secure password recovery';
COMMENT ON COLUMN "Password_Reset_Tokens".token_hash IS 'SHA-256 hash of the reset token (never store plain tokens)';
COMMENT ON COLUMN "Password_Reset_Tokens".user_id IS 'ID of the user requesting reset (can be lydo_id, sk_id, or youth_id)';
COMMENT ON COLUMN "Password_Reset_Tokens".user_type IS 'Type of user: admin, lydo_staff, sk_official, or youth';
COMMENT ON COLUMN "Password_Reset_Tokens".email IS 'Email address where reset link was sent (personal email)';
COMMENT ON COLUMN "Password_Reset_Tokens".expires_at IS 'Token expiration timestamp (1 hour from creation)';
COMMENT ON COLUMN "Password_Reset_Tokens".used_at IS 'Timestamp when token was used (prevents reuse)';

