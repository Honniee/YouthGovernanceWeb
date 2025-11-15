/**
 * Clustering Cron Service
 * Handles scheduled/automated clustering operations
 * 
 * Schedule: Monthly municipality-wide clustering
 * Trigger: 1st day of each month at 2:00 AM
 */

import cron from 'node-cron';
import youthClusteringService from './youthClusteringService.js';
import { query } from '../config/database.js';
import logger from '../utils/logger.js';

class ClusteringCronService {
  
  constructor() {
    this.cronJob = null;
    this.isRunning = false;
  }

  /**
   * Start the scheduled clustering cron job
   * Runs on the 1st day of each month at 2:00 AM
   */
  start() {
    // Schedule: '0 2 1 * *' = At 02:00 on day-of-month 1
    // For testing: '*/5 * * * *' = Every 5 minutes
    const schedule = process.env.CLUSTERING_CRON_SCHEDULE || '0 2 1 * *';
    
    logger.info('Starting Clustering Cron Service', { schedule, description: this.getCronDescription(schedule) });
    
    this.cronJob = cron.schedule(schedule, async () => {
      await this.runScheduledClustering();
    }, {
      scheduled: true,
      timezone: 'Asia/Manila' // Adjust to your timezone
    });

    logger.info('Clustering cron job scheduled successfully', { schedule, timezone: 'Asia/Manila' });
  }
  
  /**
   * Stop the cron job
   */
  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      logger.info('Clustering cron job stopped');
    }
  }
  
  /**
   * Run scheduled municipality-wide clustering
   */
  async runScheduledClustering() {
    if (this.isRunning) {
      logger.warn('Clustering already in progress, skipping this run');
      return;
    }

    this.isRunning = true;
    
    try {
      logger.info('SCHEDULED CLUSTERING STARTED', {
        time: new Date().toISOString(),
        type: 'Monthly Municipality-wide Clustering'
      });
      
      // Get system user ID for automated runs (or use a designated admin ID)
      const systemUserId = await this.getSystemUserId();
      
      // Run municipality-wide clustering
      const result = await youthClusteringService.runCompletePipeline(systemUserId, {
        runType: 'scheduled',
        scope: 'municipality',
        barangayId: null
      });
      
      logger.info('SCHEDULED CLUSTERING COMPLETED', {
        runId: result.runId,
        totalYouth: result.metrics.totalYouth,
        segmentsCreated: result.metrics.segmentsCreated,
        silhouetteScore: result.metrics.silhouetteScore.toFixed(4)
      });
      
      // Optionally: Send notification to admins about successful clustering
      await this.notifyAdmins(result);
      
    } catch (error) {
      logger.error('SCHEDULED CLUSTERING FAILED', { error: error.message, stack: error.stack });
      
      // Optionally: Send error notification to admins
      await this.notifyAdminsError(error);
      
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Get system user ID for automated operations
   * Falls back to first admin user if no system user exists
   */
  async getSystemUserId() {
    try {
      // Try to get a designated system/admin user
      const result = await query(`
        SELECT lydo_id FROM "LYDO" 
        WHERE role_id = 'ROL001' 
        ORDER BY created_at ASC 
        LIMIT 1
      `);
      
      if (result.rows.length > 0) {
        return result.rows[0].lydo_id;
      }
      
      // Fallback: return a default system ID
      return 'SYSTEM';
      
    } catch (error) {
      logger.warn('Could not get system user ID, using default', { defaultUserId: 'SYSTEM' });
      return 'SYSTEM';
    }
  }

  /**
   * Notify admins of successful clustering
   */
  async notifyAdmins(result) {
    try {
      // Get all admin users
      const admins = await query(`
        SELECT lydo_id FROM "LYDO" 
        WHERE role_id = 'ROL001' 
        AND is_active = true
      `);
      
      // Create notification for each admin
      // This is a placeholder - implement according to your notification system
      logger.debug(`Would notify ${admins.rows.length} admins about successful clustering`, { adminCount: admins.rows.length });
      
      // Example:
      // for (const admin of admins.rows) {
      //   await createNotification(admin.lydo_id, {
      //     title: 'Monthly Clustering Completed',
      //     message: `${result.metrics.totalYouth} youth segmented into ${result.metrics.segmentsCreated} groups`,
      //     type: 'success'
      //   });
      // }
      
    } catch (error) {
      logger.error('Failed to notify admins', { error: error.message, stack: error.stack });
    }
  }

  /**
   * Notify admins of clustering error
   */
  async notifyAdminsError(error) {
    try {
      const admins = await query(`
        SELECT lydo_id FROM "LYDO" 
        WHERE role_id = 'ROL001' 
        AND is_active = true
      `);
      
      logger.debug(`Would notify ${admins.rows.length} admins about clustering error`, { adminCount: admins.rows.length });
      
      // Example:
      // for (const admin of admins.rows) {
      //   await createNotification(admin.lydo_id, {
      //     title: 'Clustering Failed',
      //     message: `Scheduled clustering failed: ${error.message}`,
      //     type: 'error'
      //   });
      // }
      
    } catch (err) {
      logger.error('Failed to notify admins about error', { error: err.message, stack: err.stack });
    }
  }

  /**
   * Get human-readable description of cron schedule
   */
  getCronDescription(schedule) {
    const schedules = {
      '0 2 1 * *': 'At 02:00 on the 1st day of each month',
      '*/5 * * * *': 'Every 5 minutes (testing)',
      '0 0 * * 0': 'At 00:00 every Sunday',
      '0 3 * * *': 'At 03:00 every day'
    };
    
    return schedules[schedule] || 'Custom schedule';
  }

  /**
   * Manual trigger for testing (can be called from controller)
   */
  async triggerManualScheduledClustering(userId = 'MANUAL') {
    logger.info('Manual trigger for scheduled clustering', { userId });
    
    const result = await youthClusteringService.runCompletePipeline(userId, {
      runType: 'scheduled',
      scope: 'municipality',
      barangayId: null
    });
    
    return result;
  }

  /**
   * Get cron job status
   */
  getStatus() {
    return {
      isScheduled: this.cronJob !== null,
      isRunning: this.isRunning,
      nextRun: this.cronJob ? 'Based on schedule' : 'Not scheduled',
      schedule: process.env.CLUSTERING_CRON_SCHEDULE || '0 2 1 * *'
    };
  }
}

// Export singleton instance
const clusteringCronService = new ClusteringCronService();

// Auto-start cron job when module is loaded (only in production)
if (process.env.NODE_ENV === 'production' || process.env.ENABLE_CLUSTERING_CRON === 'true') {
  clusteringCronService.start();
} else {
  logger.info('Clustering cron job disabled in development', { recommendation: 'Set ENABLE_CLUSTERING_CRON=true to enable' });
}

export default clusteringCronService;

