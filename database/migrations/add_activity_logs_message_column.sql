-- Migration: Add message column to Activity_Logs table
-- Purpose: Store human-readable activity log messages
-- Date: 2024

-- Add message column (nullable for backward compatibility with existing logs)
ALTER TABLE "Activity_Logs" 
ADD COLUMN IF NOT EXISTS message TEXT NULL;

-- Add index for better search performance on messages
CREATE INDEX IF NOT EXISTS idx_activity_logs_message ON "Activity_Logs" USING gin(to_tsvector('english', message));

-- Add comment to document the column
COMMENT ON COLUMN "Activity_Logs".message IS 'Human-readable description of the activity (e.g., "Admin Juan Dela Cruz created survey batch ''KK Survey 2024 Q1''")';

