/**
 * Clustering Controller
 * Handles youth clustering and segmentation operations
 * Supports TWO-LEVEL SYSTEM: Municipality-wide & Barangay-specific clustering
 */

import { getClient } from '../config/database.js';
import { createAuditLog } from '../middleware/auditLogger.js';
import youthClusteringService from '../services/youthClusteringService.js';

/**
 * Run clustering manually (triggered by user)
 * Access: LYDO Admin (municipality-wide) OR SK Official (barangay-specific)
 * 
 * POST /api/clustering/run
 * Body: { scope: 'municipality' | 'barangay', barangayId?: string, batchId?: string }
 */
export const runClustering = async (req, res) => {
  const { scope = 'municipality', barangayId = null, batchId = null } = req.body;
  const userId = req.user.id; // From auth middleware
  const userRole = req.user.role; // 'LYDO' or 'SK'
  
  try {
    console.log(`🚀 Manual clustering initiated by ${userRole}: ${userId}`);
    console.log(`   Scope: ${scope}, Barangay: ${barangayId || 'All'}`);
    
    // Validation: SK Officials can only run for their barangay
    if (userRole === 'SK' && scope !== 'barangay') {
      return res.status(403).json({
        success: false,
        message: 'SK Officials can only run clustering for their barangay'
      });
    }
    
    if (scope === 'barangay' && !barangayId) {
      return res.status(400).json({
        success: false,
        message: 'Barangay ID is required for barangay-scope clustering'
      });
    }
    
    // Run clustering pipeline
    const result = await youthClusteringService.runCompletePipeline(userId, {
      runType: 'manual',
      scope,
      barangayId,
      batchId
    });
    
    // Create audit log
    await createAuditLog(
      userId,
      userRole === 'LYDO' ? 'lydo' : 'sk_official',
      'CLUSTERING',
      'RUN',
      'Clustering_Runs',
      result.runId,
      { scope, barangayId, ...result.metrics },
      req
    );
    
    res.json({
      success: true,
      message: `Clustering completed successfully for ${scope}`,
      data: {
        runId: result.runId,
        segments: result.segments.map(s => ({
          segmentId: s.segmentId,
          name: s.name,
          description: s.description,
          youthCount: s.youthCount,
          priority: s.priority
        })),
        metrics: result.metrics
      }
    });
    
  } catch (error) {
    console.error('❌ Clustering failed:', error);
    
    res.status(500).json({
      success: false,
      message: 'Clustering failed: ' + error.message,
      error: error.message
    });
  }
};

/**
 * Get all active segments (for current scope)
 * Access: LYDO Admin (all) OR SK Official (their barangay only)
 * 
 * GET /api/clustering/segments?scope=municipality&barangayId=BAR001
 */
export const getSegments = async (req, res) => {
  const { scope = 'municipality', barangayId = null, batchId = null } = req.query;
  const userRole = req.user.role;
  const client = await getClient();
  
  try {
    // Validation: SK can only view their barangay
    if (userRole === 'SK' && scope !== 'barangay') {
      return res.status(403).json({
        success: false,
        message: 'SK Officials can only view barangay-level segments'
      });
    }
    
    let query = `
      SELECT 
        s.segment_id,
        s.segment_name,
        s.segment_description,
        s.cluster_number,
        s.scope,
        s.barangay_id,
        b.barangay_name,
        s.batch_id,
        s.avg_age,
        s.avg_education_level,
        s.employment_rate,
        s.civic_engagement_rate,
        s.characteristics,
        s.youth_count,
        s.percentage,
        s.priority_level,
        s.cluster_quality_score,
        s.created_at,
        s.created_by,
        l.first_name || ' ' || l.last_name AS created_by_name
      FROM "Youth_Segments" s
      LEFT JOIN "Barangay" b ON s.barangay_id = b.barangay_id
      LEFT JOIN "LYDO" l ON s.created_by = l.lydo_id
      WHERE s.is_active = true
        AND s.scope = $1
    `;
    
    const params = [scope];
    
    if (scope === 'barangay' && barangayId) {
      query += ` AND s.barangay_id = $${params.length + 1}`;
      params.push(barangayId);
    } else if (scope === 'municipality') {
      query += ` AND s.barangay_id IS NULL`;
    }
    
    // Add batch filter if provided
    if (batchId) {
      query += ` AND s.batch_id = $${params.length + 1}`;
      params.push(batchId);
    }
    
    query += ` ORDER BY s.priority_level DESC, s.youth_count DESC`;
    
    const result = await client.query(query, params);
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
    
  } catch (error) {
    console.error('❌ Failed to fetch segments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch segments',
      error: error.message
    });
  } finally {
    client.release();
  }
};

/**
 * Get segment details with youth list
 * 
 * GET /api/clustering/segments/:segmentId
 */
export const getSegmentDetails = async (req, res) => {
  const { segmentId } = req.params;
  const client = await getClient();
  
  try {
    // Get segment info
    const segmentQuery = await client.query(`
      SELECT 
        s.*,
        b.barangay_name,
        l.first_name || ' ' || l.last_name AS created_by_name
      FROM "Youth_Segments" s
      LEFT JOIN "Barangay" b ON s.barangay_id = b.barangay_id
      LEFT JOIN "LYDO" l ON s.created_by = l.lydo_id
      WHERE s.segment_id = $1
    `, [segmentId]);
    
    if (segmentQuery.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Segment not found'
      });
    }
    
    const segment = segmentQuery.rows[0];
    
    // Get youth in this segment
    const youthQuery = await client.query(`
      SELECT 
        y.youth_id,
        y.first_name,
        y.last_name,
        y.gender,
        y.birth_date,
        EXTRACT(YEAR FROM AGE(y.birth_date)) AS age,
        y.barangay_id,
        b.barangay_name,
        r.educational_background,
        r.work_status,
        r.civil_status,
        a.assigned_at
      FROM "Youth_Cluster_Assignments" a
      JOIN "Youth_Profiling" y ON a.youth_id = y.youth_id
      LEFT JOIN "Barangay" b ON y.barangay_id = b.barangay_id
      LEFT JOIN "KK_Survey_Responses" r ON a.response_id = r.response_id
      WHERE a.segment_id = $1
      ORDER BY a.assigned_at DESC
    `, [segmentId]);
    
    // Get recommendations for this segment
    const recsQuery = await client.query(`
      SELECT 
        recommendation_id,
        program_name,
        program_type,
        description,
        target_need,
        priority_rank,
        expected_impact,
        duration_months,
        target_youth_count,
        primary_sdg,
        sdg_alignment_score
      FROM "Program_Recommendations"
      WHERE segment_id = $1
      ORDER BY priority_rank ASC
    `, [segmentId]);
    
    res.json({
      success: true,
      data: {
        segment,
        youth: youthQuery.rows,
        recommendations: recsQuery.rows,
        youthCount: youthQuery.rows.length
      }
    });
    
  } catch (error) {
    console.error('❌ Failed to fetch segment details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch segment details',
      error: error.message
    });
  } finally {
    client.release();
  }
};

/**
 * Get clustering run history
 * 
 * GET /api/clustering/runs?scope=municipality&barangayId=BAR001&limit=10
 */
export const getClusteringRuns = async (req, res) => {
  const { scope = 'municipality', barangayId = null, batchId = null, limit = 20 } = req.query;
  const client = await getClient();
  
  try {
    let query = `
      SELECT 
        r.run_id,
        r.run_type,
        r.run_status,
        r.scope,
        r.barangay_id,
        b.barangay_name,
        r.batch_id,
        r.total_responses,
        r.segments_created,
        r.overall_silhouette_score,
        r.data_quality_score,
        r.started_at,
        r.completed_at,
        r.duration_seconds,
        r.error_message,
        r.run_by,
        l.first_name || ' ' || l.last_name AS run_by_name
      FROM "Clustering_Runs" r
      LEFT JOIN "Barangay" b ON r.barangay_id = b.barangay_id
      LEFT JOIN "LYDO" l ON r.run_by = l.lydo_id
      WHERE r.scope = $1
    `;
    
    const params = [scope];
    
    if (scope === 'barangay' && barangayId) {
      query += ` AND r.barangay_id = $${params.length + 1}`;
      params.push(barangayId);
    } else if (scope === 'municipality') {
      query += ` AND r.barangay_id IS NULL`;
    }
    
    // Add batch filter if provided
    if (batchId) {
      query += ` AND r.batch_id = $${params.length + 1}`;
      params.push(batchId);
    }
    
    query += ` ORDER BY r.started_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);
    
    const result = await client.query(query, params);
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
    
  } catch (error) {
    console.error('❌ Failed to fetch clustering runs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch clustering runs',
      error: error.message
    });
  } finally {
    client.release();
  }
};

/**
 * Get clustering statistics
 * 
 * GET /api/clustering/stats?scope=municipality&barangayId=BAR001
 */
export const getClusteringStats = async (req, res) => {
  const { scope = 'municipality', barangayId = null, batchId = null } = req.query;
  const client = await getClient();
  
  try {
    // Get latest run
    let latestRunQuery = `
      SELECT * FROM "Clustering_Runs"
      WHERE scope = $1 AND run_status = 'completed'
    `;
    
    const params = [scope];
    
    if (scope === 'barangay' && barangayId) {
      latestRunQuery += ` AND barangay_id = $${params.length + 1}`;
      params.push(barangayId);
    } else if (scope === 'municipality') {
      latestRunQuery += ` AND barangay_id IS NULL`;
    }
    
    // Add batch filter if provided
    if (batchId) {
      latestRunQuery += ` AND batch_id = $${params.length + 1}`;
      params.push(batchId);
    }
    
    latestRunQuery += ` ORDER BY completed_at DESC LIMIT 1`;
    
    const latestRun = await client.query(latestRunQuery, params);
    
    if (latestRun.rows.length === 0) {
      return res.json({
        success: true,
        data: {
          hasData: false,
          message: 'No clustering has been run yet'
        }
      });
    }
    
    // Get segment distribution - Create new params array for this query
    let segmentQuery = `
      SELECT 
        segment_name,
        youth_count,
        percentage,
        priority_level,
        employment_rate,
        civic_engagement_rate
      FROM "Youth_Segments"
      WHERE is_active = true AND scope = $1
    `;
    
    const segmentParams = [scope];
    
    if (scope === 'barangay' && barangayId) {
      segmentQuery += ` AND barangay_id = $${segmentParams.length + 1}`;
      segmentParams.push(barangayId);
    } else if (scope === 'municipality') {
      segmentQuery += ` AND barangay_id IS NULL`;
    }
    
    // Add batch filter if provided
    if (batchId) {
      segmentQuery += ` AND batch_id = $${segmentParams.length + 1}`;
      segmentParams.push(batchId);
    }
    
    segmentQuery += ` ORDER BY youth_count DESC`;
    
    const segments = await client.query(segmentQuery, segmentParams);
    
    // Calculate totals
    const totalYouth = segments.rows.reduce((sum, s) => sum + s.youth_count, 0);
    const highPriority = segments.rows.filter(s => s.priority_level === 'high').length;
    
    res.json({
      success: true,
      data: {
        hasData: true,
        latestRun: latestRun.rows[0],
        segments: segments.rows,
        summary: {
          totalYouth,
          totalSegments: segments.rows.length,
          highPrioritySegments: highPriority,
          avgSilhouetteScore: latestRun.rows[0].overall_silhouette_score,
          dataQuality: latestRun.rows[0].data_quality_score
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Failed to fetch clustering stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch clustering statistics',
      error: error.message
    });
  } finally {
    client.release();
  }
};

/**
 * Get program recommendations summary
 * 
 * GET /api/clustering/recommendations?scope=municipality&barangayId=BAR001&segmentId=SEG123
 */
export const getRecommendations = async (req, res) => {
  const { scope = 'municipality', barangayId = null, segmentId = null } = req.query;
  const client = await getClient();
  
  try {
    let query = `
      SELECT 
        r.recommendation_id,
        r.segment_id,
        s.segment_name,
        s.youth_count AS segment_youth_count,
        r.program_name,
        r.program_type,
        r.description,
        r.target_need,
        r.priority_rank,
        r.expected_impact,
        r.duration_months,
        r.target_youth_count,
        r.primary_sdg,
        r.sdg_alignment_score
      FROM "Program_Recommendations" r
      JOIN "Youth_Segments" s ON r.segment_id = s.segment_id
      WHERE s.is_active = true
    `;
    
    const params = [];
    
    // Filter by segment_id if provided
    if (segmentId) {
      query += ` AND r.segment_id = $${params.length + 1}`;
      params.push(segmentId);
    } else {
      // If no segmentId, filter by scope
      query += ` AND s.scope = $${params.length + 1}`;
      params.push(scope);
      
      if (scope === 'barangay' && barangayId) {
        query += ` AND s.barangay_id = $${params.length + 1}`;
        params.push(barangayId);
      } else if (scope === 'municipality') {
        query += ` AND s.barangay_id IS NULL`;
      }
    }
    
    query += ` ORDER BY r.priority_rank ASC`;
    
    const result = await client.query(query, params);
    
    // Group by program type
    const byType = result.rows.reduce((acc, rec) => {
      const type = rec.program_type || 'Other';
      if (!acc[type]) acc[type] = [];
      acc[type].push(rec);
      return acc;
    }, {});
    
    res.json({
      success: true,
      data: {
        all: result.rows,
        byType,
        totalRecommendations: result.rows.length
      }
    });
    
  } catch (error) {
    console.error('❌ Failed to fetch recommendations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recommendations',
      error: error.message
    });
  } finally {
    client.release();
  }
};

