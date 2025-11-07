import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  getParticipatedYouth,
  getNotParticipatedYouth,
  getBarangayStats,
  getSKOfficialsByBarangay,
  getYouthParticipation,
  getBarangayYouth
} from '../controllers/surveyTrackingController.js';
import { requireRole } from '../middleware/roleCheck.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// =============================================================================
// SPECIFIC ROUTES (must come before parameterized routes)
// =============================================================================

/**
 * @route   GET /api/survey-tracking/youth-participation
 * @desc    Get all youth with their participation status across all batches
 * @access  Admin, Staff
 */
router.get('/youth-participation', requireRole(['admin', 'lydo_staff']), getYouthParticipation);

/**
 * @route   GET /api/survey-tracking/barangay-youth
 * @desc    Get all youth grouped by barangay with current survey participation status
 * @access  Admin, Staff
 */
router.get('/barangay-youth', requireRole(['admin', 'lydo_staff']), getBarangayYouth);

/**
 * @route   GET /api/survey-tracking/sk-officials/:barangayId
 * @desc    Get SK officials for a specific barangay
 * @access  Admin, Staff
 */
router.get('/sk-officials/:barangayId', requireRole(['admin', 'lydo_staff']), getSKOfficialsByBarangay);

// =============================================================================
// PARAMETERIZED ROUTES (must come after specific routes)
// =============================================================================

/**
 * @route   GET /api/survey-tracking/:batchId/participated
 * @desc    Get youth who participated in a survey batch
 * @access  Admin, Staff
 */
router.get('/:batchId/participated', requireRole(['admin', 'lydo_staff']), getParticipatedYouth);

/**
 * @route   GET /api/survey-tracking/:batchId/not-participated
 * @desc    Get youth who did NOT participate in a survey batch
 * @access  Admin, Staff
 */
router.get('/:batchId/not-participated', requireRole(['admin', 'lydo_staff']), getNotParticipatedYouth);

/**
 * @route   GET /api/survey-tracking/:batchId/barangay-stats
 * @desc    Get barangay-level participation statistics
 * @access  Admin, Staff
 */
router.get('/:batchId/barangay-stats', requireRole(['admin', 'lydo_staff']), getBarangayStats);

export default router;

