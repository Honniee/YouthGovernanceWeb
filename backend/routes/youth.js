/**
 * Youth Routes
 * Handles youth-related API endpoints
 */

import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/roleCheck.js';
import { getValidatedYouth, getYouthStats, archiveYouth, unarchiveYouth, exportYouth, bulkUpdateStatus } from '../controllers/youthController.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * @route   GET /api/youth/validated
 * @desc    Get all validated youth (youth with validated survey responses)
 * @access  Private (Admin/Staff)
 */
router.get('/validated', getValidatedYouth);

/**
 * @route   GET /api/youth/stats
 * @desc    Get youth statistics and age distribution
 * @access  Private (Admin/Staff)
 */
router.get('/stats', getYouthStats);

/**
 * @route   PATCH /api/youth/:id/archive
 * @desc    Archive a youth (set is_active=false)
 * @access  Private (Admin/Staff)
 */
router.patch('/:id/archive', requireRole(['admin', 'lydo_staff']), archiveYouth);

/**
 * @route   PATCH /api/youth/:id/unarchive
 * @desc    Unarchive a youth (set is_active=true)
 * @access  Private (Admin/Staff)
 */
router.patch('/:id/unarchive', requireRole(['admin', 'lydo_staff']), unarchiveYouth);

/**
 * @route   GET /api/youth/export
 * @desc    Export youth data (logging endpoint for activity logs)
 * @access  Private (Admin/Staff)
 */
router.get('/export', requireRole(['admin', 'lydo_staff']), exportYouth);

/**
 * @route   POST /api/youth/bulk
 * @desc    Bulk archive/unarchive youth
 * @access  Private (Admin/Staff)
 */
router.post('/bulk', requireRole(['admin', 'lydo_staff']), bulkUpdateStatus);

export default router;