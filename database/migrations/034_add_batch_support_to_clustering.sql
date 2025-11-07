-- ==========================================
-- ADD BATCH SUPPORT TO CLUSTERING SYSTEM
-- Allow clustering per survey batch
-- ==========================================

-- Add batch_id to Youth_Segments
ALTER TABLE "Youth_Segments" 
ADD COLUMN IF NOT EXISTS batch_id VARCHAR(20);

-- Add batch_id to Clustering_Runs
ALTER TABLE "Clustering_Runs" 
ADD COLUMN IF NOT EXISTS batch_id VARCHAR(20);

-- Add foreign key constraint (if Batches table exists)
-- Note: This will fail gracefully if the foreign key already exists or if the table doesn't exist
DO $$ 
BEGIN
    -- Add foreign key for Youth_Segments
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Survey_Batches') THEN
        BEGIN
            ALTER TABLE "Youth_Segments" 
            ADD CONSTRAINT fk_segment_batch 
            FOREIGN KEY (batch_id) REFERENCES "Survey_Batches"(batch_id) ON DELETE CASCADE;
            
            RAISE NOTICE '✅ Added foreign key for Youth_Segments.batch_id';
        EXCEPTION WHEN duplicate_object THEN
            RAISE NOTICE 'ℹ️  Foreign key for Youth_Segments.batch_id already exists';
        END;
        
        BEGIN
            ALTER TABLE "Clustering_Runs" 
            ADD CONSTRAINT fk_run_batch 
            FOREIGN KEY (batch_id) REFERENCES "Survey_Batches"(batch_id) ON DELETE CASCADE;
            
            RAISE NOTICE '✅ Added foreign key for Clustering_Runs.batch_id';
        EXCEPTION WHEN duplicate_object THEN
            RAISE NOTICE 'ℹ️  Foreign key for Clustering_Runs.batch_id already exists';
        END;
    ELSE
        RAISE NOTICE '⚠️  Survey_Batches table not found - skipping foreign keys';
    END IF;
END $$;

-- Add indexes for batch filtering
CREATE INDEX IF NOT EXISTS idx_segments_batch ON "Youth_Segments"(batch_id) WHERE batch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_runs_batch ON "Clustering_Runs"(batch_id) WHERE batch_id IS NOT NULL;

-- Update scope index to include batch_id
DROP INDEX IF EXISTS idx_segments_scope;
CREATE INDEX idx_segments_scope_batch ON "Youth_Segments"(scope, barangay_id, batch_id);

DROP INDEX IF EXISTS idx_runs_scope;
CREATE INDEX idx_runs_scope_batch ON "Clustering_Runs"(scope, barangay_id, batch_id);

-- Add comments
COMMENT ON COLUMN "Youth_Segments"."batch_id" IS 'Survey batch ID - NULL means clustering across all batches';
COMMENT ON COLUMN "Clustering_Runs"."batch_id" IS 'Survey batch ID that was clustered - NULL means all batches';

-- Success message
DO $$ 
BEGIN 
    RAISE NOTICE '';
    RAISE NOTICE '════════════════════════════════════════════════════════════';
    RAISE NOTICE '✅ BATCH SUPPORT ADDED TO CLUSTERING SYSTEM!';
    RAISE NOTICE '════════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE '   📊 Changes Applied:';
    RAISE NOTICE '      - Added batch_id to Youth_Segments';
    RAISE NOTICE '      - Added batch_id to Clustering_Runs';
    RAISE NOTICE '      - Updated indexes for batch filtering';
    RAISE NOTICE '';
    RAISE NOTICE '   🎯 Now Supports:';
    RAISE NOTICE '      1. Clustering per survey batch';
    RAISE NOTICE '      2. Clustering per barangay per batch';
    RAISE NOTICE '      3. Clustering across all batches (batch_id = NULL)';
    RAISE NOTICE '';
    RAISE NOTICE '════════════════════════════════════════════════════════════';
END $$;

