import dataRetentionService from '../services/dataRetentionService.js';
import { requireRole } from '../middleware/roleCheck.js';
import { createAuditLog } from '../middleware/auditLogger.js';
import logger from '../utils/logger.js';

/**
 * Process data retention checks
 * POST /api/data-retention/process
 */
export const processRetention = async (req, res) => {
  try {
    const result = await dataRetentionService.processRetentionChecks();

    // Log retention processing
    createAuditLog({
      userId: req.user?.id || 'SYSTEM',
      userType: req.user?.userType || 'admin',
      action: 'Process',
      resource: '/api/data-retention',
      resourceId: 'retention-process',
      resourceName: 'Data Retention Processing',
      details: {
        totalAnonymized: result.totalAnonymized,
        youthProfiles: result.youthProfiles?.anonymizedCount || 0,
        surveyResponses: result.surveyResponses?.anonymizedCount || 0,
      },
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      status: 'success',
    }).catch(err => logger.error('Audit log failed', { error: err.message, stack: err.stack }));

    res.json({
      success: true,
      message: 'Data retention processing completed',
      data: result,
    });
  } catch (error) {
    logger.error('Data retention processing error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Failed to process data retention',
      error: error.message,
    });
  }
};

/**
 * Get retention statistics
 * GET /api/data-retention/statistics
 */
export const getRetentionStatistics = async (req, res) => {
  try {
    const result = await dataRetentionService.getRetentionStatistics();

    res.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    logger.error('Get retention statistics error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Failed to get retention statistics',
      error: error.message,
    });
  }
};

/**
 * Update youth retention dates
 * POST /api/data-retention/update-youth-dates
 */
export const updateYouthRetentionDates = async (req, res) => {
  try {
    const result = await dataRetentionService.updateYouthRetentionDates();

    // Log update
    createAuditLog({
      userId: req.user?.id || 'SYSTEM',
      userType: req.user?.userType || 'admin',
      action: 'Update',
      resource: '/api/data-retention',
      resourceId: 'youth-retention-dates',
      resourceName: 'Update Youth Retention Dates',
      details: {
        updatedCount: result.updatedCount,
      },
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      status: 'success',
    }).catch(err => logger.error('Audit log failed', { error: err.message, stack: err.stack }));

    res.json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (error) {
    logger.error('Update youth retention dates error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Failed to update youth retention dates',
      error: error.message,
    });
  }
};

/**
 * Update survey response retention dates
 * POST /api/data-retention/update-survey-dates
 */
export const updateSurveyRetentionDates = async (req, res) => {
  try {
    const result = await dataRetentionService.updateSurveyResponseRetentionDates();

    // Log update
    createAuditLog({
      userId: req.user?.id || 'SYSTEM',
      userType: req.user?.userType || 'admin',
      action: 'Update',
      resource: '/api/data-retention',
      resourceId: 'survey-retention-dates',
      resourceName: 'Update Survey Response Retention Dates',
      details: {
        updatedCount: result.updatedCount,
      },
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      status: 'success',
    }).catch(err => logger.error('Audit log failed', { error: err.message, stack: err.stack }));

    res.json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (error) {
    logger.error('Update survey retention dates error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Failed to update survey retention dates',
      error: error.message,
    });
  }
};


