-- Migration: Fix Activity_Logs table for SK Terms Management
-- Description: Fix syntax error and add category index for better query performance
-- Date: 2025-01-01

-- Fix 1: Fix syntax error in message column (if table already exists with wrong syntax, this won't apply)
-- Note: If the table was created with the syntax error, you'll need to manually fix it first
-- The correct syntax is already in schema_postgresql.sql

-- Fix 2: Add category index for better filtering performance
-- This index helps when filtering activity logs by category (e.g., 'Term Management')
CREATE INDEX IF NOT EXISTS idx_activity_logs_category ON "Activity_Logs" (category);

-- Verify the index was created
SELECT 
    indexname, 
    indexdef 
FROM pg_indexes 
WHERE tablename = 'Activity_Logs' 
AND indexname = 'idx_activity_logs_category';



