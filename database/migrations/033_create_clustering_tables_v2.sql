-- ==========================================
-- YOUTH CLUSTERING SYSTEM - DATABASE SCHEMA (V2 - SAFE VERSION)
-- K-Means Clustering for Youth Segmentation
-- TWO-LEVEL SYSTEM: Municipality & Barangay
-- ==========================================
-- 
-- This version creates tables WITHOUT foreign keys first,
-- then adds them only if the referenced tables/columns exist
--
-- Author: Business Analytics Senior Project
-- Date: 2024

-- TABLE 1: Youth Segments (NO FOREIGN KEYS YET)
CREATE TABLE IF NOT EXISTS "Youth_Segments" (
    segment_id VARCHAR(20) PRIMARY KEY,
    segment_name VARCHAR(100) NOT NULL,
    segment_description TEXT,
    cluster_number INTEGER NOT NULL,
    
    -- TWO-LEVEL SUPPORT
    scope TEXT CHECK (scope IN ('municipality', 'barangay')) DEFAULT 'municipality',
    barangay_id VARCHAR(20) NULL,
    
    -- Segment Profile
    avg_age DECIMAL(4,2),
    avg_education_level DECIMAL(4,2),
    employment_rate DECIMAL(5,4),
    civic_engagement_rate DECIMAL(5,4),
    characteristics JSONB,
    
    -- Size & Priority
    youth_count INTEGER DEFAULT 0,
    percentage DECIMAL(5,2),
    priority_level TEXT CHECK (priority_level IN ('high', 'medium', 'low')),
    
    -- Quality Metrics
    cluster_quality_score DECIMAL(5,4),
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(20)
);

-- TABLE 2: Youth Cluster Assignments (NO FOREIGN KEYS YET)
CREATE TABLE IF NOT EXISTS "Youth_Cluster_Assignments" (
    assignment_id VARCHAR(20) PRIMARY KEY,
    youth_id VARCHAR(20) NOT NULL,
    segment_id VARCHAR(20) NOT NULL,
    response_id VARCHAR(20) NOT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    confidence_score DECIMAL(5,4)
);

-- TABLE 3: Program Recommendations (NO FOREIGN KEYS YET)
CREATE TABLE IF NOT EXISTS "Program_Recommendations" (
    recommendation_id VARCHAR(20) PRIMARY KEY,
    segment_id VARCHAR(20) NOT NULL,
    program_name VARCHAR(200) NOT NULL,
    program_type VARCHAR(100),
    description TEXT,
    target_need VARCHAR(100),
    priority_rank INTEGER,
    expected_impact TEXT CHECK (expected_impact IN ('high', 'medium', 'low')),
    duration_months INTEGER,
    target_youth_count INTEGER,
    implementation_plan TEXT,
    success_metrics JSONB,
    primary_sdg VARCHAR(50),
    sdg_alignment_score INTEGER CHECK (sdg_alignment_score BETWEEN 0 AND 100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- TABLE 4: Clustering Runs (NO FOREIGN KEYS YET)
CREATE TABLE IF NOT EXISTS "Clustering_Runs" (
    run_id VARCHAR(20) PRIMARY KEY,
    run_type TEXT CHECK (run_type IN ('manual', 'scheduled')) NOT NULL,
    run_status TEXT CHECK (run_status IN ('running', 'completed', 'failed')),
    scope TEXT CHECK (scope IN ('municipality', 'barangay')) DEFAULT 'municipality',
    barangay_id VARCHAR(20) NULL,
    total_responses INTEGER,
    segments_created INTEGER DEFAULT 5,
    overall_silhouette_score DECIMAL(5,4),
    data_quality_score DECIMAL(5,4),
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    duration_seconds INTEGER,
    run_by VARCHAR(20),
    error_message TEXT
);

-- Now add foreign keys ONLY IF the referenced tables/columns exist
-- This prevents errors if your database schema has different column names

-- Try to add foreign keys for Youth_Segments
DO $$ 
BEGIN
    -- Add foreign key to Barangay if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Barangay' AND column_name = 'barangay_id'
    ) THEN
        ALTER TABLE "Youth_Segments" 
        ADD CONSTRAINT fk_segment_barangay 
        FOREIGN KEY (barangay_id) REFERENCES "Barangay"(barangay_id) ON DELETE CASCADE;
        RAISE NOTICE '✅ Added foreign key: Youth_Segments -> Barangay';
    ELSE
        RAISE NOTICE '⚠️  Skipped foreign key: Barangay table not found';
    END IF;

    -- Add foreign key to LYDO if it exists (OPTIONAL - won't fail if missing)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'LYDO' AND column_name = 'lydo_id'
    ) THEN
        BEGIN
            ALTER TABLE "Youth_Segments" 
            ADD CONSTRAINT fk_segment_creator 
            FOREIGN KEY (created_by) REFERENCES "LYDO"(lydo_id) ON DELETE SET NULL;
            RAISE NOTICE '✅ Added foreign key: Youth_Segments -> LYDO';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '⚠️  Could not add LYDO foreign key (non-critical): %', SQLERRM;
        END;
    END IF;
END $$;

-- Add foreign keys for Youth_Cluster_Assignments
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Youth_Profiling' AND column_name = 'youth_id'
    ) THEN
        ALTER TABLE "Youth_Cluster_Assignments" 
        ADD CONSTRAINT fk_assignment_youth 
        FOREIGN KEY (youth_id) REFERENCES "Youth_Profiling"(youth_id) ON DELETE CASCADE;
        RAISE NOTICE '✅ Added foreign key: Youth_Cluster_Assignments -> Youth_Profiling';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'Youth_Segments'
    ) THEN
        ALTER TABLE "Youth_Cluster_Assignments" 
        ADD CONSTRAINT fk_assignment_segment 
        FOREIGN KEY (segment_id) REFERENCES "Youth_Segments"(segment_id) ON DELETE CASCADE;
        RAISE NOTICE '✅ Added foreign key: Youth_Cluster_Assignments -> Youth_Segments';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'KK_Survey_Responses' AND column_name = 'response_id'
    ) THEN
        ALTER TABLE "Youth_Cluster_Assignments" 
        ADD CONSTRAINT fk_assignment_response 
        FOREIGN KEY (response_id) REFERENCES "KK_Survey_Responses"(response_id) ON DELETE CASCADE;
        RAISE NOTICE '✅ Added foreign key: Youth_Cluster_Assignments -> KK_Survey_Responses';
    END IF;
END $$;

-- Add foreign key for Program_Recommendations
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'Youth_Segments'
    ) THEN
        ALTER TABLE "Program_Recommendations" 
        ADD CONSTRAINT fk_recommendation_segment 
        FOREIGN KEY (segment_id) REFERENCES "Youth_Segments"(segment_id) ON DELETE CASCADE;
        RAISE NOTICE '✅ Added foreign key: Program_Recommendations -> Youth_Segments';
    END IF;
END $$;

-- Add foreign keys for Clustering_Runs
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Barangay' AND column_name = 'barangay_id'
    ) THEN
        ALTER TABLE "Clustering_Runs" 
        ADD CONSTRAINT fk_run_barangay 
        FOREIGN KEY (barangay_id) REFERENCES "Barangay"(barangay_id) ON DELETE CASCADE;
        RAISE NOTICE '✅ Added foreign key: Clustering_Runs -> Barangay';
    END IF;

    -- LYDO foreign key (optional)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'LYDO' AND column_name = 'lydo_id'
    ) THEN
        BEGIN
            ALTER TABLE "Clustering_Runs" 
            ADD CONSTRAINT fk_run_executor 
            FOREIGN KEY (run_by) REFERENCES "LYDO"(lydo_id) ON DELETE SET NULL;
            RAISE NOTICE '✅ Added foreign key: Clustering_Runs -> LYDO';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '⚠️  Could not add LYDO foreign key (non-critical): %', SQLERRM;
        END;
    END IF;
END $$;

-- Create Indexes
CREATE INDEX IF NOT EXISTS idx_segments_active ON "Youth_Segments"(is_active);
CREATE INDEX IF NOT EXISTS idx_segments_cluster ON "Youth_Segments"(cluster_number);
CREATE INDEX IF NOT EXISTS idx_segments_scope ON "Youth_Segments"(scope, barangay_id);
CREATE INDEX IF NOT EXISTS idx_segments_barangay ON "Youth_Segments"(barangay_id) WHERE barangay_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_assignments_youth ON "Youth_Cluster_Assignments"(youth_id);
CREATE INDEX IF NOT EXISTS idx_assignments_segment ON "Youth_Cluster_Assignments"(segment_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_segment ON "Program_Recommendations"(segment_id, priority_rank);
CREATE INDEX IF NOT EXISTS idx_runs_status ON "Clustering_Runs"(run_status, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_runs_scope ON "Clustering_Runs"(scope, barangay_id);

-- Add Comments
COMMENT ON TABLE "Youth_Segments" IS 'K-Means clustering segments - supports municipality and barangay levels';
COMMENT ON TABLE "Youth_Cluster_Assignments" IS 'Maps each youth to their assigned cluster segment';
COMMENT ON TABLE "Program_Recommendations" IS 'Personalized program recommendations per segment';
COMMENT ON TABLE "Clustering_Runs" IS 'Tracks clustering execution with quality metrics';

-- Success message
DO $$ 
BEGIN 
    RAISE NOTICE '';
    RAISE NOTICE '════════════════════════════════════════════════════════════';
    RAISE NOTICE '✅ YOUTH CLUSTERING SYSTEM CREATED SUCCESSFULLY!';
    RAISE NOTICE '════════════════════════════════════════════════════════════';
    RAISE NOTICE '   Tables Created:';
    RAISE NOTICE '   1. Youth_Segments';
    RAISE NOTICE '   2. Youth_Cluster_Assignments';
    RAISE NOTICE '   3. Program_Recommendations';
    RAISE NOTICE '   4. Clustering_Runs';
    RAISE NOTICE '';
    RAISE NOTICE '   Indexes: 9 indexes created';
    RAISE NOTICE '   Foreign Keys: Added where possible (check messages above)';
    RAISE NOTICE '';
    RAISE NOTICE '   Next Step: Install dependencies';
    RAISE NOTICE '   Run: npm install ml-kmeans node-cron';
    RAISE NOTICE '════════════════════════════════════════════════════════════';
END $$;

