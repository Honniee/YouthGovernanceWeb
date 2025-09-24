import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/roleCheck.js';
import { 
  getHomePageStatistics,
  getAdminDashboardStatistics
} from '../controllers/statisticsController.js';

const router = express.Router();

// =============================================================================
// PUBLIC STATISTICS (no authentication required)
// =============================================================================

/**
 * @route   GET /api/statistics/home
 * @desc    Get home page statistics (public access)
 * @access  Public
 */
router.get('/home', getHomePageStatistics);

// Apply authentication middleware to admin routes
router.use(authenticateToken);

// =============================================================================
// ADMIN STATISTICS (authentication required)
// =============================================================================

/**
 * @route   GET /api/statistics/admin/dashboard
 * @desc    Get comprehensive admin dashboard statistics
 * @access  Admin only
 */
router.get('/admin/dashboard', requireRole('admin'), getAdminDashboardStatistics);

export default router;
