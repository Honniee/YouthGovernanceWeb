import skTermsAutoUpdateService from '../services/skTermsAutoUpdateService.js';
import clusteringCronService from '../services/clusteringCronService.js';
import backupService from '../scripts/database-backup.js';
import dataRetentionService from '../services/dataRetentionService.js';
import logger from '../utils/logger.js';

/**
 * Cron Job Controller
 * Handles automated tasks and scheduled operations
 */

/**
 * Daily automatic SK terms status update
 * This endpoint should be called by a cron job daily at midnight
 * GET /api/cron/update-term-statuses
 */
const updateTermStatuses = async (req, res) => {
  try {
    logger.info('Cron job triggered: Update SK Term Statuses');
    
    // Verify this is a legitimate cron job request
    const cronSecret = req.headers['x-cron-secret'];
    if (!cronSecret || cronSecret !== process.env.CRON_SECRET) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized cron job request'
      });
    }
    
    const result = await skTermsAutoUpdateService.updateTermStatuses();
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Term statuses updated successfully',
        data: result
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to update term statuses',
        error: result.error
      });
    }
    
  } catch (error) {
    logger.error('Cron job error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Internal server error during cron job execution',
      error: error.message
    });
  }
};

/**
 * Manual trigger for term status updates (for testing)
 * GET /api/cron/manual-update-term-statuses
 */
const manualUpdateTermStatuses = async (req, res) => {
  try {
    logger.info('Manual cron job triggered: Update SK Term Statuses');
    
    const result = await skTermsAutoUpdateService.triggerManualUpdate();
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Manual term status update completed successfully',
        data: result
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to update term statuses manually',
        error: result.error
      });
    }
    
  } catch (error) {
    logger.error('Manual cron job error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Internal server error during manual cron job execution',
      error: error.message
    });
  }
};

/**
 * Get pending status updates (for monitoring)
 * GET /api/cron/pending-status-updates
 */
const getPendingStatusUpdates = async (req, res) => {
  try {
    const pendingUpdates = await skTermsAutoUpdateService.getPendingStatusUpdates();
    
    res.json({
      success: true,
      data: {
        pendingUpdates,
        count: pendingUpdates.length,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    logger.error('Error getting pending status updates', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Failed to get pending status updates',
      error: error.message
    });
  }
};

/**
 * Manual trigger for scheduled clustering (for testing)
 * GET /api/cron/manual-clustering
 */
const manualTriggerClustering = async (req, res) => {
  try {
    logger.info('Manual clustering cron job triggered');
    
    const result = await clusteringCronService.triggerManualScheduledClustering('MANUAL_TRIGGER');
    
    res.json({
      success: true,
      message: 'Manual clustering completed successfully',
      data: {
        runId: result.runId,
        metrics: result.metrics
      }
    });
    
  } catch (error) {
    logger.error('Manual clustering cron job error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Failed to run manual clustering',
      error: error.message
    });
  }
};

/**
 * Get clustering cron job status
 * GET /api/cron/clustering-status
 */
const getClusteringCronStatus = async (req, res) => {
  try {
    const status = clusteringCronService.getStatus();
    
    res.json({
      success: true,
      data: status
    });
    
  } catch (error) {
    logger.error('Error getting clustering cron status', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Failed to get clustering cron status',
      error: error.message
    });
  }
};

/**
 * Get SK Terms cron job status
 * GET /api/cron/sk-terms-status
 */
const getSKTermsCronStatus = async (req, res) => {
  try {
    const status = skTermsAutoUpdateService.getStatus();
    
    res.json({
      success: true,
      data: status
    });
    
  } catch (error) {
    logger.error('Error getting SK Terms cron status', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Failed to get SK Terms cron status',
      error: error.message
    });
  }
};

/**
 * Daily automatic database backup
 * This endpoint should be called by a cron job daily
 * GET /api/cron/backup
 */
const runBackup = async (req, res) => {
  try {
    logger.info('Cron job triggered: Database Backup');
    
    // Verify this is a legitimate cron job request
    const cronSecret = req.headers['x-cron-secret'];
    if (!cronSecret || cronSecret !== process.env.CRON_SECRET) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized cron job request'
      });
    }
    
    const result = await backupService.createBackup();
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Database backup completed successfully',
        data: result
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Database backup failed',
        error: result.error
      });
    }
    
  } catch (error) {
    logger.error('Backup cron job error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Internal server error during backup cron job execution',
      error: error.message
    });
  }
};

/**
 * Manual trigger for database backup (for testing)
 * GET /api/cron/manual-backup
 */
const manualBackup = async (req, res) => {
  try {
    logger.info('Manual backup cron job triggered');
    
    const result = await backupService.createBackup();
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Manual backup completed successfully',
        data: result
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Manual backup failed',
        error: result.error
      });
    }
    
  } catch (error) {
    logger.error('Manual backup cron job error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Failed to run manual backup',
      error: error.message
    });
  }
};

/**
 * Monthly data retention check
 * This endpoint should be called by a cron job monthly
 * GET /api/cron/data-retention
 */
const runDataRetention = async (req, res) => {
  try {
    logger.info('Cron job triggered: Data Retention Check');
    
    // Verify this is a legitimate cron job request
    const cronSecret = req.headers['x-cron-secret'];
    if (!cronSecret || cronSecret !== process.env.CRON_SECRET) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized cron job request'
      });
    }
    
    const result = await dataRetentionService.processRetentionChecks();
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Data retention processing completed successfully',
        data: result
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Data retention processing failed',
        error: result.message
      });
    }
    
  } catch (error) {
    logger.error('Data retention cron job error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Internal server error during data retention cron job execution',
      error: error.message
    });
  }
};

/**
 * Manual trigger for data retention (for testing)
 * GET /api/cron/manual-data-retention
 */
const manualDataRetention = async (req, res) => {
  try {
    logger.info('Manual data retention cron job triggered');
    
    const result = await dataRetentionService.processRetentionChecks();
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Manual data retention processing completed successfully',
        data: result
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Manual data retention processing failed',
        error: result.message
      });
    }
    
  } catch (error) {
    logger.error('Manual data retention cron job error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Failed to run manual data retention',
      error: error.message
    });
  }
};

export {
  updateTermStatuses,
  manualUpdateTermStatuses,
  getPendingStatusUpdates,
  manualTriggerClustering,
  getClusteringCronStatus,
  getSKTermsCronStatus,
  runBackup,
  manualBackup,
  runDataRetention,
  manualDataRetention
};
