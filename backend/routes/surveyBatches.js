import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/roleCheck.js';
import { surveyBatchesLimiter, bulkOperationLimiter } from '../middleware/rateLimiter.js';
import {
  validateCreateBatch,
  validateUpdateBatch,
  validateUpdateStatus,
  validateQuery,
  validateBusinessRules,
  validateBulkOp
} from '../middleware/surveyBatchValidation.js';
import { 
  createBatch,
  getAllBatches,
  getBatchById,
  updateBatch,
  deleteBatch,
  updateBatchStatus,
  getBatchStatistics,
  getDashboardStats,
  getBatchesNeedingUpdate,
  checkBusinessRules,
  bulkUpdateStatus,
  getBatchResponses,
  exportSurveyBatches
} from '../controllers/surveyBatchesController.js';

const router = express.Router();

// Apply rate limiting to all survey batch routes
router.use(surveyBatchesLimiter);

// =============================================================================
// PUBLIC ROUTES (no authentication required)
// =============================================================================

/**
 * @route   GET /api/survey-batches/active
 * @desc    Get the currently active survey batch (public access)
 * @access  Public
 */
router.get('/active', getAllBatches);

// Apply authentication middleware to all routes after this point
router.use(authenticateToken);

// =============================================================================
// BATCH CRUD OPERATIONS
// =============================================================================

/**
 * @route   GET /api/survey-batches
 * @desc    Get all survey batches with filtering and pagination
 * @access  Admin, Staff, and SK Officials
 * @query   page, pageSize, status, search, sortBy, sortOrder, includeStats
 */
router.get('/', requireRole(['admin', 'lydo_staff', 'sk_official']), validateQuery, getAllBatches);

/**
 * @route   POST /api/survey-batches
 * @desc    Create a new survey batch
 * @access  Admin and LYDO Staff
 * @body    batchName, description, startDate, endDate, targetAgeMin, targetAgeMax
 */
router.post('/', requireRole(['admin', 'lydo_staff']), validateCreateBatch, createBatch);

// =============================================================================
// EXPORT OPERATIONS (must come before parameterized routes)
// =============================================================================

/**
 * @route   GET /api/survey-batches/export
 * @desc    Export survey batch data (logging endpoint for activity logs)
 * @access  Admin and LYDO Staff
 * @query   format, selectedIds, logFormat, count, status
 */
router.get('/export', requireRole(['admin', 'lydo_staff']), exportSurveyBatches);

// =============================================================================
// BATCH CRUD OPERATIONS (continued)
// =============================================================================

/**
 * @route   GET /api/survey-batches/:id
 * @desc    Get a single survey batch by ID
 * @access  Admin, LYDO Staff, and SK Officials
 * @query   includeStats
 */
router.get('/:id', requireRole(['admin', 'lydo_staff', 'sk_official']), getBatchById);

/**
 * @route   PUT /api/survey-batches/:id
 * @desc    Update a survey batch
 * @access  Admin and LYDO Staff
 * @body    batchName, description, startDate, endDate, targetAgeMin, targetAgeMax
 */
router.put('/:id', requireRole(['admin', 'lydo_staff']), validateUpdateBatch, updateBatch);

/**
 * @route   DELETE /api/survey-batches/:id
 * @desc    Delete a survey batch
 * @access  Admin only
 */
router.delete('/:id', requireRole('admin'), deleteBatch);

// =============================================================================
// STATUS MANAGEMENT
// =============================================================================

/**
 * @route   PATCH /api/survey-batches/:id/status
 * @desc    Update batch status (activate, pause, resume, close, force actions)
 * @access  Admin and LYDO Staff
 * @body    status, reason, action
 */
router.patch('/:id/status', requireRole(['admin', 'lydo_staff']), validateUpdateStatus, updateBatchStatus);

// =============================================================================
// STATISTICS AND UTILITIES
// =============================================================================

/**
 * @route   GET /api/survey-batches/statistics/dashboard
 * @desc    Get dashboard statistics for all batches
 * @access  Admin, Staff, and SK Officials
 */
router.get('/statistics/dashboard', requireRole(['admin', 'lydo_staff', 'sk_official']), getDashboardStats);

/**
 * @route   GET /api/survey-batches/:id/statistics
 * @desc    Get detailed statistics for a specific batch
 * @access  Admin only
 */
router.get('/:id/statistics', requireRole('admin'), getBatchStatistics);

/**
 * @route   GET /api/survey-batches/:id/responses
 * @desc    Get responses for a specific survey batch
 * @access  Admin, LYDO Staff, and SK Officials
 * @query   page, limit, search, status, barangay
 */
router.get('/:id/responses', requireRole(['admin', 'lydo_staff', 'sk_official']), getBatchResponses);

/**
 * @route   GET /api/survey-batches/utilities/auto-update
 * @desc    Get batches that need automatic status updates (for client-side auto-update)
 * @access  Admin only
 */
router.get('/utilities/auto-update', requireRole('admin'), getBatchesNeedingUpdate);

/**
 * @route   GET /api/survey-batches/utilities/business-rules
 * @desc    Check business rules (active KK survey, date conflicts)
 * @access  Admin only
 * @query   startDate, endDate, excludeBatchId
 */
router.get('/utilities/business-rules', requireRole('admin'), validateBusinessRules, checkBusinessRules);

// =============================================================================
// BULK OPERATIONS
// =============================================================================

/**
 * @route   POST /api/survey-batches/bulk/status
 * @desc    Bulk update batch statuses
 * @access  Admin only
 * @body    batchIds, status, reason
 */
router.post('/bulk/status', requireRole('admin'), bulkOperationLimiter, validateBulkOp, bulkUpdateStatus);

export default router;
