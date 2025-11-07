/**
 * Clustering Routes
 * Handles youth clustering and segmentation API endpoints
 * Supports TWO-LEVEL SYSTEM: Municipality-wide & Barangay-specific
 */

import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/roleCheck.js';
import {
  runClustering,
  getSegments,
  getSegmentDetails,
  getClusteringRuns,
  getClusteringStats,
  getRecommendations
} from '../controllers/clusteringController.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * @route   POST /api/clustering/run
 * @desc    Run clustering manually (municipality-wide or barangay-specific)
 * @access  Private (LYDO Admin for municipality, SK Official for barangay)
 * @body    { scope: 'municipality' | 'barangay', barangayId?: string }
 */
router.post('/run', requireRole(['admin', 'lydo_staff', 'sk_official']), runClustering);

/**
 * @route   GET /api/clustering/segments
 * @desc    Get all active segments for scope
 * @access  Private (Admin/Staff/SK)
 * @query   scope=municipality&barangayId=BAR001
 */
router.get('/segments', getSegments);

/**
 * @route   GET /api/clustering/segments/:segmentId
 * @desc    Get detailed segment information with youth list
 * @access  Private (Admin/Staff/SK)
 */
router.get('/segments/:segmentId', getSegmentDetails);

/**
 * @route   GET /api/clustering/runs
 * @desc    Get clustering run history
 * @access  Private (Admin/Staff/SK)
 * @query   scope=municipality&barangayId=BAR001&limit=20
 */
router.get('/runs', getClusteringRuns);

/**
 * @route   GET /api/clustering/stats
 * @desc    Get clustering statistics and metrics
 * @access  Private (Admin/Staff/SK)
 * @query   scope=municipality&barangayId=BAR001
 */
router.get('/stats', getClusteringStats);

/**
 * @route   GET /api/clustering/recommendations
 * @desc    Get program recommendations for segments
 * @access  Private (Admin/Staff/SK)
 * @query   scope=municipality&barangayId=BAR001
 */
router.get('/recommendations', getRecommendations);

export default router;

