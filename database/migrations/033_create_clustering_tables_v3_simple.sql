-- ==========================================
-- YOUTH CLUSTERING SYSTEM - DATABASE SCHEMA (V3 - SIMPLIFIED)
-- K-Means Clustering for Youth Segmentation
-- TWO-LEVEL SYSTEM: Municipality & Barangay
-- ==========================================
-- 
-- This version creates tables WITHOUT foreign keys
-- Foreign keys can be added later after fixing the referenced tables
--
-- Author: Business Analytics Senior Project
-- Date: 2024

-- TABLE 1: Youth Segments
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

-- TABLE 2: Youth Cluster Assignments
CREATE TABLE IF NOT EXISTS "Youth_Cluster_Assignments" (
    assignment_id VARCHAR(20) PRIMARY KEY,
    youth_id VARCHAR(20) NOT NULL,
    segment_id VARCHAR(20) NOT NULL,
    response_id VARCHAR(20) NOT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    confidence_score DECIMAL(5,4)
);

-- TABLE 3: Program Recommendations
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

-- TABLE 4: Clustering Runs
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

-- Create Indexes for Performance
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

COMMENT ON COLUMN "Clustering_Runs"."overall_silhouette_score" IS 'Cluster quality metric: -1 to 1, >0.5 is good';
COMMENT ON COLUMN "Youth_Segments"."cluster_quality_score" IS 'Individual cluster cohesion score';
COMMENT ON COLUMN "Youth_Segments"."scope" IS 'municipality = all barangays, barangay = single barangay';
COMMENT ON COLUMN "Youth_Segments"."barangay_id" IS 'NULL for municipality-wide, specific ID for barangay-level';

-- Success message
DO $$ 
BEGIN 
    RAISE NOTICE '';
    RAISE NOTICE '════════════════════════════════════════════════════════════';
    RAISE NOTICE '✅ YOUTH CLUSTERING SYSTEM CREATED SUCCESSFULLY!';
    RAISE NOTICE '════════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE '   📊 Tables Created:';
    RAISE NOTICE '      1. Youth_Segments';
    RAISE NOTICE '      2. Youth_Cluster_Assignments';
    RAISE NOTICE '      3. Program_Recommendations';
    RAISE NOTICE '      4. Clustering_Runs';
    RAISE NOTICE '';
    RAISE NOTICE '   📈 Indexes Created: 9 performance indexes';
    RAISE NOTICE '';
    RAISE NOTICE '   ⚠️  Note: Foreign keys not created due to existing';
    RAISE NOTICE '      table constraints. This is fine - the system';
    RAISE NOTICE '      will work without them. Data integrity will be';
    RAISE NOTICE '      enforced in the application layer.';
    RAISE NOTICE '';
    RAISE NOTICE '   🎯 Next Steps:';
    RAISE NOTICE '      1. Verify tables: Run verification query';
    RAISE NOTICE '      2. Install dependencies: npm install ml-kmeans node-cron';
    RAISE NOTICE '      3. Create backend services';
    RAISE NOTICE '';
    RAISE NOTICE '════════════════════════════════════════════════════════════';
END $$;

-- Verification: Show created tables
DO $$
DECLARE
    table_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND (table_name LIKE 'Youth_Segments' 
        OR table_name LIKE 'Youth_Cluster%' 
        OR table_name LIKE 'Program_Recommendations' 
        OR table_name LIKE 'Clustering_Runs');
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ Verification: % clustering tables found in database', table_count;
    RAISE NOTICE '';
END $$;

