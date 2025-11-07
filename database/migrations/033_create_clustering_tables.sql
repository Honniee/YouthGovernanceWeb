-- ==========================================
-- YOUTH CLUSTERING SYSTEM - DATABASE SCHEMA
-- K-Means Clustering for Youth Segmentation
-- TWO-LEVEL SYSTEM: Municipality & Barangay
-- ==========================================
-- 
-- Purpose: Support AI-powered youth segmentation for targeted program recommendations
-- Author: Business Analytics Senior Project
-- Date: 2024
--
-- This migration creates 4 tables:
-- 1. Youth_Segments - Stores cluster definitions (municipality or barangay level)
-- 2. Youth_Cluster_Assignments - Links youth to their assigned segments
-- 3. Program_Recommendations - Stores recommended programs per segment
-- 4. Clustering_Runs - Tracks each clustering execution with quality metrics

-- TABLE 1: Youth Segments
-- Stores cluster definitions for BOTH municipality and barangay levels
CREATE TABLE IF NOT EXISTS "Youth_Segments" (
    segment_id VARCHAR(20) PRIMARY KEY,
    segment_name VARCHAR(100) NOT NULL,
    segment_description TEXT,
    cluster_number INTEGER NOT NULL, -- 0-4 (5 clusters) or 0-2 (3 clusters for small barangays)
    
    -- TWO-LEVEL SUPPORT
    scope TEXT CHECK (scope IN ('municipality', 'barangay')) DEFAULT 'municipality',
    barangay_id VARCHAR(20) NULL, -- NULL = municipality-wide, specific ID = barangay-level
    
    -- Segment Profile (Averages)
    avg_age DECIMAL(4,2),
    avg_education_level DECIMAL(4,2),
    employment_rate DECIMAL(5,4),
    civic_engagement_rate DECIMAL(5,4),
    
    -- Complete Characteristics (JSON)
    characteristics JSONB,
    
    -- Size & Priority
    youth_count INTEGER DEFAULT 0,
    percentage DECIMAL(5,2),
    priority_level TEXT CHECK (priority_level IN ('high', 'medium', 'low')),
    
    -- Quality Metrics
    cluster_quality_score DECIMAL(5,4), -- Silhouette score for this cluster
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(20),
    
    -- Foreign keys - will be added after checking if columns exist
    CONSTRAINT fk_segment_creator FOREIGN KEY (created_by) REFERENCES "LYDO"(lydo_id) ON DELETE SET NULL,
    CONSTRAINT fk_segment_barangay FOREIGN KEY (barangay_id) REFERENCES "Barangay"(barangay_id) ON DELETE CASCADE
);

-- TABLE 2: Youth Cluster Assignments
-- Links each youth to their assigned segment
CREATE TABLE IF NOT EXISTS "Youth_Cluster_Assignments" (
    assignment_id VARCHAR(20) PRIMARY KEY,
    youth_id VARCHAR(20) NOT NULL,
    segment_id VARCHAR(20) NOT NULL,
    response_id VARCHAR(20) NOT NULL,
    
    -- Metadata
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    confidence_score DECIMAL(5,4), -- Distance from cluster center (lower is better)
    
    CONSTRAINT fk_assignment_youth FOREIGN KEY (youth_id) REFERENCES "Youth_Profiling"(youth_id) ON DELETE CASCADE,
    CONSTRAINT fk_assignment_segment FOREIGN KEY (segment_id) REFERENCES "Youth_Segments"(segment_id) ON DELETE CASCADE,
    CONSTRAINT fk_assignment_response FOREIGN KEY (response_id) REFERENCES "KK_Survey_Responses"(response_id) ON DELETE CASCADE
);

-- TABLE 3: Program Recommendations
-- Stores recommended programs for each segment
CREATE TABLE IF NOT EXISTS "Program_Recommendations" (
    recommendation_id VARCHAR(20) PRIMARY KEY,
    segment_id VARCHAR(20) NOT NULL,
    
    -- Program Details
    program_name VARCHAR(200) NOT NULL,
    program_type VARCHAR(100), -- 'Employment', 'Education', 'Skills', 'Health', 'Civic'
    description TEXT,
    
    -- Targeting
    target_need VARCHAR(100), -- 'Job Training', 'Career Counseling', 'Skills Development'
    priority_rank INTEGER, -- 1 = highest priority
    expected_impact TEXT CHECK (expected_impact IN ('high', 'medium', 'low')),
    
    -- Implementation
    duration_months INTEGER,
    target_youth_count INTEGER,
    implementation_plan TEXT,
    success_metrics JSONB,
    
    -- SDG Alignment (Sustainable Development Goals)
    primary_sdg VARCHAR(50), -- 'SDG 8: Decent Work', 'SDG 4: Quality Education'
    sdg_alignment_score INTEGER CHECK (sdg_alignment_score BETWEEN 0 AND 100), -- 0-100
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_recommendation_segment FOREIGN KEY (segment_id) REFERENCES "Youth_Segments"(segment_id) ON DELETE CASCADE
);

-- TABLE 4: Clustering Runs
-- Tracks each clustering execution for BOTH municipality and barangay levels
CREATE TABLE IF NOT EXISTS "Clustering_Runs" (
    run_id VARCHAR(20) PRIMARY KEY,
    run_type TEXT CHECK (run_type IN ('manual', 'scheduled')) NOT NULL,
    run_status TEXT CHECK (run_status IN ('running', 'completed', 'failed')),
    
    -- TWO-LEVEL SUPPORT
    scope TEXT CHECK (scope IN ('municipality', 'barangay')) DEFAULT 'municipality',
    barangay_id VARCHAR(20) NULL, -- NULL = municipality-wide, specific ID = barangay-level
    
    -- Input Data
    total_responses INTEGER,
    segments_created INTEGER DEFAULT 5,
    
    -- Quality Metrics (IMPORTANT FOR THESIS!)
    overall_silhouette_score DECIMAL(5,4), -- Main quality indicator (-1 to 1, >0.5 is good)
    data_quality_score DECIMAL(5,4), -- Input data completeness (0 to 1)
    
    -- Timing
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    duration_seconds INTEGER,
    
    -- Execution Details
    run_by VARCHAR(20),
    error_message TEXT,
    
    CONSTRAINT fk_run_executor FOREIGN KEY (run_by) REFERENCES "LYDO"(lydo_id) ON DELETE SET NULL,
    CONSTRAINT fk_run_barangay FOREIGN KEY (barangay_id) REFERENCES "Barangay"(barangay_id) ON DELETE CASCADE
);

-- Create Indexes for Performance (ENHANCED FOR TWO-LEVEL)
CREATE INDEX IF NOT EXISTS idx_segments_active ON "Youth_Segments"(is_active);
CREATE INDEX IF NOT EXISTS idx_segments_cluster ON "Youth_Segments"(cluster_number);
CREATE INDEX IF NOT EXISTS idx_segments_scope ON "Youth_Segments"(scope, barangay_id);
CREATE INDEX IF NOT EXISTS idx_segments_barangay ON "Youth_Segments"(barangay_id) WHERE barangay_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_assignments_youth ON "Youth_Cluster_Assignments"(youth_id);
CREATE INDEX IF NOT EXISTS idx_assignments_segment ON "Youth_Cluster_Assignments"(segment_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_segment ON "Program_Recommendations"(segment_id, priority_rank);
CREATE INDEX IF NOT EXISTS idx_runs_status ON "Clustering_Runs"(run_status, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_runs_scope ON "Clustering_Runs"(scope, barangay_id);

-- Add Comments (Documentation)
COMMENT ON TABLE "Youth_Segments" IS 'K-Means clustering segments for youth profiling - supports municipality and barangay levels';
COMMENT ON TABLE "Youth_Cluster_Assignments" IS 'Maps each youth to their assigned cluster segment';
COMMENT ON TABLE "Program_Recommendations" IS 'Personalized program recommendations generated per segment';
COMMENT ON TABLE "Clustering_Runs" IS 'Tracks each clustering execution with quality metrics - tracks both municipality and barangay runs';

COMMENT ON COLUMN "Clustering_Runs"."overall_silhouette_score" IS 'Cluster quality metric: closer to 1 is better, >0.5 is good';
COMMENT ON COLUMN "Youth_Segments"."cluster_quality_score" IS 'Individual cluster cohesion score';
COMMENT ON COLUMN "Youth_Segments"."scope" IS 'municipality = all barangays, barangay = single barangay clustering';
COMMENT ON COLUMN "Youth_Segments"."barangay_id" IS 'NULL for municipality-wide segments, specific barangay_id for barangay-level segments';
COMMENT ON COLUMN "Clustering_Runs"."scope" IS 'municipality = LYDO ran clustering for all barangays, barangay = SK Official ran for their barangay';

-- Success message
DO $$ 
BEGIN 
    RAISE NOTICE '✅ Youth Clustering System tables created successfully!';
    RAISE NOTICE '   - Youth_Segments';
    RAISE NOTICE '   - Youth_Cluster_Assignments';
    RAISE NOTICE '   - Program_Recommendations';
    RAISE NOTICE '   - Clustering_Runs';
END $$;

