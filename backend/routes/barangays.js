import express from 'express';
import {
  getAllBarangays,
  getBarangayById,
  getBarangayStatistics,
  getBarangayYouth
} from '../controllers/barangaysController.js';

const router = express.Router();

// =============================================================================
// PUBLIC ROUTES (No authentication required)
// =============================================================================

/**
 * @route   GET /api/barangays
 * @desc    Get all barangays with youth statistics
 * @access  Public
 * @query   sortBy (barangay_name|youth_count|created_at)
 * @query   sortOrder (asc|desc)
 * @query   search (string)
 */
router.get('/', getAllBarangays);

/**
 * @route   GET /api/barangays/statistics
 * @desc    Get barangay statistics summary
 * @access  Public
 */
router.get('/statistics', getBarangayStatistics);

/**
 * @route   GET /api/barangays/:id
 * @desc    Get barangay by ID with detailed information
 * @access  Public
 */
router.get('/:id', getBarangayById);

/**
 * @route   GET /api/barangays/:id/youth
 * @desc    Get youth list for a specific barangay
 * @access  Public
 * @query   page (number, default: 1)
 * @query   limit (number, default: 50, max: 100)
 * @query   activeOnly (boolean, default: true)
 * @query   sortBy (last_name|first_name|age|created_at)
 * @query   sortOrder (asc|desc)
 */
router.get('/:id/youth', getBarangayYouth);

export default router;
