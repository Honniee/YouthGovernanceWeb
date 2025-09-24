import SurveyBatchesService from '../services/surveyBatchesService.js';
import { sanitizeInput, validatePagination, validateSorting } from '../utils/validation.js';
import { createAuditLog } from '../middleware/auditLogger.js';
import logger from '../utils/logger.js';

// Simple string sanitizer for individual fields
const sanitizeString = (str) => {
  if (typeof str !== 'string') return str;
  return str
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .replace(/data:/gi, '') // Remove data: protocol
    .replace(/vbscript:/gi, '') // Remove vbscript: protocol
    .trim();
};

// Map DB row to API response shape
const mapBatchRow = (row) => ({
  batchId: row.batch_id,
  batchName: row.batch_name,
  description: row.description,
  startDate: row.start_date,
  endDate: row.end_date,
  status: row.status,
  targetAgeMin: row.target_age_min,
  targetAgeMax: row.target_age_max,
  createdBy: row.created_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  // Audit fields
  pausedAt: row.paused_at,
  pausedBy: row.paused_by,
  pausedReason: row.paused_reason,
  resumedAt: row.resumed_at,
  resumedBy: row.resumed_by,
  // Statistics (if included) - map from view fields to frontend field names
  statisticsTotalResponses: row.total_responses || row.statistics_total_responses || 0,
  statisticsValidatedResponses: row.validated_responses || row.statistics_validated_responses || 0,
  statisticsRejectedResponses: row.rejected_responses || row.statistics_rejected_responses || 0,
  statisticsPendingResponses: row.pending_responses || row.statistics_pending_responses || 0,
  statisticsTotalYouths: row.total_youths || row.statistics_total_youths || 0,
  statisticsTotalYouthsSurveyed: row.total_youths_surveyed || row.statistics_total_youths_surveyed || 0,
  statisticsTotalYouthsNotSurveyed: row.total_youths_not_surveyed || row.statistics_total_youths_not_surveyed || 0,
  // Calculated fields (if from views)
  responseRate: row.response_rate || null,
  validationRate: row.validation_rate || null,
  daysRemaining: row.days_remaining || null,
  isOverdue: row.is_overdue || false
});

// =============================================================================
// BATCH CRUD OPERATIONS
// =============================================================================

/**
 * Create a new survey batch
 */
export const createBatch = async (req, res) => {
  try {
    // Get user ID with multiple fallback options (same as voter controller)
    let lydoId = req.user?.lydo_id || req.user?.lydoId || req.user?.userId || req.user?.id;

    // If missing LYDO ID, try to resolve by email (same as voter controller)
    if (!lydoId && req.user?.email) {
      try {
        const { getClient } = await import('../config/database.js');
        const client = await getClient();
        const lookup = await client.query('SELECT lydo_id FROM "LYDO" WHERE LOWER(email) = LOWER($1) AND is_active = true', [req.user.email]);
        lydoId = lookup.rows?.[0]?.lydo_id || null;
        client.release();
      } catch (_) {
        // ignore and fallback below
      }
    }

    // Sanitize input data
    const sanitizedData = {
      batch_name: sanitizeString(req.body.batchName || req.body.batch_name),
      description: sanitizeString(req.body.description),
      start_date: req.body.startDate || req.body.start_date,
      end_date: req.body.endDate || req.body.end_date,
      target_age_min: parseInt(req.body.targetAgeMin || req.body.target_age_min) || 15,
      target_age_max: parseInt(req.body.targetAgeMax || req.body.target_age_max) || 30,
      created_by: lydoId
    };

    // Validate required fields
    if (!sanitizedData.batch_name) {
      return res.status(400).json({
        success: false,
        message: 'Batch name is required'
      });
    }

    if (!sanitizedData.start_date || !sanitizedData.end_date) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    if (!sanitizedData.created_by) {
      return res.status(401).json({
        success: false,
        message: 'Missing LYDO ID for creator. Please re-login and try again.'
      });
    }

    // Create the batch using service
    const newBatch = await SurveyBatchesService.createBatch(sanitizedData);

    // Create audit log
    await createAuditLog({
      userId: sanitizedData.created_by,
      action: 'CREATE_SURVEY_BATCH',
      resourceType: 'Survey_Batch',
      resourceId: newBatch.batch_id,
      details: `Created survey batch: ${newBatch.batch_name}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(201).json({
      success: true,
      message: 'Survey batch created successfully',
      data: mapBatchRow(newBatch)
    });

  } catch (error) {
    logger.error('Create batch error:', error);
    logger.error('Error message:', error.message);
    logger.error('Error type:', typeof error.message);
    
    if (error.message.includes('Validation failed')) {
      logger.error('Returning validation error:', error.message);
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create survey batch',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get all survey batches with filtering and pagination
 */
export const getAllBatches = async (req, res) => {
  try {
    console.log('🔍 Backend - getAllBatches called with query:', req.query);
    console.log('🔍 Backend - includeStats parameter check:', {
      includeStats: req.query.includeStats,
      includeStatsType: typeof req.query.includeStats,
      include_stats: req.query.include_stats,
      include_statsType: typeof req.query.include_stats
    });
    
    // Validate and sanitize query parameters
    const { page, limit } = validatePagination(req.query);
    const { sortBy, sortOrder } = validateSorting({
      sortBy: req.query.sortBy || req.query.sort_by,
      sortOrder: req.query.sortOrder || req.query.sort_order,
      allowedFields: ['created_at', 'updated_at', 'start_date', 'end_date', 'batch_name', 'status']
    });

    const options = {
      page,
      pageSize: limit,
      status: req.query.status,
      search: sanitizeString(req.query.search || req.query.q),
      sortBy,
      sortOrder,
      includeStats: req.query.includeStats === 'true' || req.query.includeStats === true || req.query.include_stats === 'true' || req.query.include_stats === true,
      dateCreated: req.query.dateCreated || req.query.date_created
    };
    
    console.log('🔍 Backend - Processed options:', options);

    // Get batches from service
    const result = await SurveyBatchesService.getAllBatches(options);

    res.json({
      success: true,
      data: result.data.map(mapBatchRow),
      pagination: {
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
        totalPages: result.totalPages
      }
    });

  } catch (error) {
    logger.error('Get all batches error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve survey batches',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get a single survey batch by ID
 */
export const getBatchById = async (req, res) => {
  try {
    const { id } = req.params;
    const includeStats = req.query.includeStats === 'true' || req.query.include_stats === 'true';

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Batch ID is required'
      });
    }

    const batch = await SurveyBatchesService.getBatchById(id, includeStats);

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Survey batch not found'
      });
    }

    res.json({
      success: true,
      data: mapBatchRow(batch)
    });

  } catch (error) {
    logger.error('Get batch by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve survey batch',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update a survey batch
 */
export const updateBatch = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || req.user?.lydo_id || req.user?.lydoId;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Batch ID is required'
      });
    }

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required'
      });
    }

    // Sanitize update data
    const updateData = {};
    if (req.body.batchName || req.body.batch_name) {
      updateData.batch_name = sanitizeString(req.body.batchName || req.body.batch_name);
    }
    if (req.body.description !== undefined) {
      updateData.description = sanitizeString(req.body.description);
    }
    if (req.body.startDate || req.body.start_date) {
      updateData.start_date = req.body.startDate || req.body.start_date;
    }
    if (req.body.endDate || req.body.end_date) {
      updateData.end_date = req.body.endDate || req.body.end_date;
    }
    if (req.body.targetAgeMin || req.body.target_age_min) {
      updateData.target_age_min = parseInt(req.body.targetAgeMin || req.body.target_age_min);
    }
    if (req.body.targetAgeMax || req.body.target_age_max) {
      updateData.target_age_max = parseInt(req.body.targetAgeMax || req.body.target_age_max);
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields to update'
      });
    }

    const updatedBatch = await SurveyBatchesService.updateBatch(id, updateData);

    // Create audit log
    await createAuditLog({
      userId,
      action: 'UPDATE_SURVEY_BATCH',
      resourceType: 'Survey_Batch',
      resourceId: id,
      details: `Updated survey batch: ${updatedBatch.batch_name}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'Survey batch updated successfully',
      data: mapBatchRow(updatedBatch)
    });

  } catch (error) {
    logger.error('Update batch error:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    if (error.message.includes('Validation failed')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update survey batch',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Delete a survey batch
 */
export const deleteBatch = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || req.user?.lydo_id || req.user?.lydoId;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Batch ID is required'
      });
    }

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required'
      });
    }

    // Get batch details for audit log
    const batch = await SurveyBatchesService.getBatchById(id);
    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Survey batch not found'
      });
    }

    const deleted = await SurveyBatchesService.deleteBatch(id, userId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Survey batch not found'
      });
    }

    // Create audit log
    await createAuditLog({
      userId,
      action: 'DELETE_SURVEY_BATCH',
      resourceType: 'Survey_Batch',
      resourceId: id,
      details: `Deleted survey batch: ${batch.batch_name}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'Survey batch deleted successfully'
    });

  } catch (error) {
    logger.error('Delete batch error:', error);
    
    if (error.message.includes('Cannot delete')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to delete survey batch',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// =============================================================================
// STATUS MANAGEMENT
// =============================================================================

/**
 * Update batch status (activate, pause, resume, close, force actions)
 */
export const updateBatchStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason, action } = req.body;
    const userId = req.user?.id || req.user?.lydo_id || req.user?.lydoId;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Batch ID is required'
      });
    }

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required'
      });
    }

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    // Validate status
    if (!SurveyBatchesService.VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Valid statuses: ${SurveyBatchesService.VALID_STATUSES.join(', ')}`
      });
    }

    // Prepare options
    const options = {
      reason: sanitizeString(reason),
      isPause: action === 'pause',
      isForce: action === 'force-activate' || action === 'force-close' || action === 'force'
    };

    const updatedBatch = await SurveyBatchesService.updateBatchStatus(id, status, userId, options);

    // Create audit log with action-specific details
    const actionMap = {
      'pause': 'PAUSE_SURVEY_BATCH',
      'resume': 'RESUME_SURVEY_BATCH',
      'activate': 'ACTIVATE_SURVEY_BATCH',
      'close': 'CLOSE_SURVEY_BATCH',
      'force-activate': 'FORCE_ACTIVATE_SURVEY_BATCH',
      'force-close': 'FORCE_CLOSE_SURVEY_BATCH'
    };

    await createAuditLog({
      userId,
      action: actionMap[action] || 'UPDATE_SURVEY_BATCH_STATUS',
      resourceType: 'Survey_Batch',
      resourceId: id,
      details: `${action || 'Updated'} survey batch: ${updatedBatch.batch_name}${reason ? ` (Reason: ${reason})` : ''}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: `Survey batch ${action || 'status updated'} successfully`,
      data: mapBatchRow(updatedBatch)
    });

  } catch (error) {
    logger.error('Update batch status error:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    if (error.message.includes('Invalid status transition') || 
        error.message.includes('Only one active') ||
        error.message.includes('Reason is required')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update survey batch status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// =============================================================================
// STATISTICS AND UTILITIES
// =============================================================================

/**
 * Get batch statistics
 */
export const getBatchStatistics = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Batch ID is required'
      });
    }

    const statistics = await SurveyBatchesService.calculateBatchStatistics(id);

    res.json({
      success: true,
      data: statistics
    });

  } catch (error) {
    logger.error('Get batch statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve batch statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get dashboard statistics
 */
export const getDashboardStats = async (req, res) => {
  try {
    const stats = await SurveyBatchesService.getDashboardStats();

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve dashboard statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get responses for a specific survey batch
 */
export const getBatchResponses = async (req, res) => {
  try {
    const { id: batchId } = req.params;
    const { page = 1, limit = 10, search, status } = req.query;

    const responses = await SurveyBatchesService.getBatchResponses(batchId, {
      page: parseInt(page),
      limit: parseInt(limit),
      search,
      status
    });

    res.json({
      success: true,
      data: responses
    });
  } catch (error) {
    console.error('Error getting batch responses:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve batch responses',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get batches needing status updates (for client-side auto-update)
 */
export const getBatchesNeedingUpdate = async (req, res) => {
  try {
    const batches = await SurveyBatchesService.getBatchesNeedingStatusUpdate();

    res.json({
      success: true,
      data: batches
    });

  } catch (error) {
    logger.error('Get batches needing update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve batches needing update',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Check business rules (active KK survey, date conflicts)
 */
export const checkBusinessRules = async (req, res) => {
  try {
    const { startDate, endDate, excludeBatchId } = req.query;

    const results = {};

    // Check active KK survey
    const activeKK = await SurveyBatchesService.checkActiveKKSurvey(excludeBatchId);
    results.activeKKSurvey = activeKK;

    // Check date conflicts if dates provided
    if (startDate && endDate) {
      const dateConflicts = await SurveyBatchesService.checkDateConflicts(startDate, endDate, excludeBatchId);
      results.dateConflicts = dateConflicts;
    }

    res.json({
      success: true,
      data: results
    });

  } catch (error) {
    logger.error('Check business rules error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check business rules',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// =============================================================================
// BULK OPERATIONS (Future Enhancement)
// =============================================================================

/**
 * Bulk update batch statuses
 */
export const bulkUpdateStatus = async (req, res) => {
  try {
    const { batchIds, status, reason } = req.body;
    const userId = req.user?.id || req.user?.lydo_id || req.user?.lydoId;

    if (!batchIds || !Array.isArray(batchIds) || batchIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Batch IDs array is required'
      });
    }

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required'
      });
    }

    const results = [];
    const errors = [];

    // Process each batch
    for (const batchId of batchIds) {
      try {
        const options = { reason: sanitizeString(reason) };
        const updatedBatch = await SurveyBatchesService.updateBatchStatus(batchId, status, userId, options);
        results.push({
          batchId,
          success: true,
          data: mapBatchRow(updatedBatch)
        });

        // Create audit log
        await createAuditLog({
          userId,
          action: 'BULK_UPDATE_SURVEY_BATCH_STATUS',
          resourceType: 'Survey_Batch',
          resourceId: batchId,
          details: `Bulk status update to ${status}: ${updatedBatch.batch_name}${reason ? ` (Reason: ${reason})` : ''}`,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        });

      } catch (error) {
        errors.push({
          batchId,
          error: error.message
        });
      }
    }

    res.json({
      success: errors.length === 0,
      message: `Bulk operation completed. ${results.length} successful, ${errors.length} failed.`,
      data: {
        successful: results,
        failed: errors
      }
    });

  } catch (error) {
    logger.error('Bulk update status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to perform bulk status update',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};



