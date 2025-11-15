import backupService from '../scripts/database-backup.js';
import { requireRole } from '../middleware/roleCheck.js';
import { createAuditLog } from '../middleware/auditLogger.js';
import logger from '../utils/logger.js';

/**
 * Create database backup
 * POST /api/backup/create
 */
export const createBackup = async (req, res) => {
  try {
    const result = await backupService.createBackup();

    if (result.success) {
      // Log backup creation
      createAuditLog({
        userId: req.user?.id || 'SYSTEM',
        userType: req.user?.userType || 'admin',
        action: 'Create',
        resource: '/api/backup',
        resourceId: result.filename,
        resourceName: `Backup: ${result.filename}`,
        details: {
          filename: result.filename,
          size: result.size,
          sizeMB: result.sizeMB,
        },
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        status: 'success',
      }).catch(err => logger.error('Audit log failed', { error: err.message, stack: err.stack }));

      res.json({
        success: true,
        message: 'Backup created successfully',
        data: result,
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Backup failed',
        error: result.error,
      });
    }
  } catch (error) {
    logger.error('Backup creation error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Failed to create backup',
      error: error.message,
    });
  }
};

/**
 * List available backups
 * GET /api/backup/list
 */
export const listBackups = async (req, res) => {
  try {
    const backups = await backupService.listBackups();

    res.json({
      success: true,
      data: backups,
      count: backups.length,
    });
  } catch (error) {
    logger.error('List backups error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Failed to list backups',
      error: error.message,
    });
  }
};

/**
 * Restore database from backup
 * POST /api/backup/restore
 */
export const restoreBackup = async (req, res) => {
  try {
    const { filename } = req.body;

    if (!filename) {
      return res.status(400).json({
        success: false,
        message: 'Backup filename is required',
      });
    }

    // Log restore attempt
    createAuditLog({
      userId: req.user?.id || 'SYSTEM',
      userType: req.user?.userType || 'admin',
      action: 'Restore',
      resource: '/api/backup/restore',
      resourceId: filename,
      resourceName: `Restore: ${filename}`,
      details: {
        filename,
        performedBy: req.user?.id,
      },
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      status: 'pending',
    }).catch(err => logger.error('Audit log failed', { error: err.message, stack: err.stack }));

    const result = await backupService.restoreBackup(filename);

    if (result.success) {
      // Update audit log
      createAuditLog({
        userId: req.user?.id || 'SYSTEM',
        userType: req.user?.userType || 'admin',
        action: 'Restore',
        resource: '/api/backup/restore',
        resourceId: filename,
        resourceName: `Restore: ${filename}`,
        details: {
          filename,
          performedBy: req.user?.id,
        },
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        status: 'success',
      }).catch(err => logger.error('Audit log failed', { error: err.message, stack: err.stack }));

      res.json({
        success: true,
        message: 'Database restored successfully',
        data: result,
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Restore failed',
        error: result.error,
      });
    }
  } catch (error) {
    logger.error('Restore error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Failed to restore backup',
      error: error.message,
    });
  }
};

/**
 * Get backup status
 * GET /api/backup/status
 */
export const getBackupStatus = async (req, res) => {
  try {
    const { query } = await import('../config/database.js');
    
    // Get last backup from database
    let lastBackup = null;
    try {
      const result = await query(
        `SELECT * FROM "Backup_Logs" 
         ORDER BY created_at DESC 
         LIMIT 1`
      );
      lastBackup = result.rows[0];
    } catch (error) {
      // Table might not exist
      logger.error('Failed to get backup status from database', { error: error.message, stack: error.stack });
    }

    // List backups from filesystem
    const backups = await backupService.listBackups();

    res.json({
      success: true,
      data: {
        enabled: process.env.BACKUP_ENABLED === 'true',
        storageType: process.env.BACKUP_STORAGE_TYPE || 'local',
        lastBackup,
        totalBackups: backups.length,
        backups: backups.slice(0, 10), // Last 10 backups
      },
    });
  } catch (error) {
    logger.error('Get backup status error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Failed to get backup status',
      error: error.message,
    });
  }
};


