import { query, getClient } from '../config/database.js';
import notificationService from './notificationService.js';
import universalAuditService from './universalAuditService.js';
import universalNotificationService from './universalNotificationService.js';
import { createAuditLog } from '../middleware/auditLogger.js';
import { emitToAdmins, emitToRole } from './realtime.js';
import cron from 'node-cron';
import logger from '../utils/logger.js';

/**
 * Automatic SK Terms Status Update Service
 * Handles daily automatic status transitions based on dates
 */

class SKTermsAutoUpdateService {
  
  constructor() {
    this.cronJob = null;
    this.isRunning = false;
  }

  /**
   * Start the scheduled cron job for automatic term status updates
   * Runs daily at midnight (00:00)
   */
  start() {
    if (this.cronJob) {
      logger.warn('SK Terms cron job is already running');
      return;
    }

    // Schedule: '0 0 * * *' = Daily at midnight (00:00)
    // Can be customized via SK_TERMS_CRON_SCHEDULE environment variable
    const schedule = process.env.SK_TERMS_CRON_SCHEDULE || '0 0 * * *';
    
    logger.info('Starting SK Terms Auto-Update Cron Service', {
      schedule,
      description: 'Daily at midnight',
      timezone: process.env.TZ || 'Asia/Manila'
    });

    this.cronJob = cron.schedule(schedule, async () => {
      await this.runScheduledUpdate();
    }, {
      scheduled: true,
      timezone: process.env.TZ || 'Asia/Manila'
    });

    logger.info('SK Terms cron job scheduled successfully', { schedule, timezone: process.env.TZ || 'Asia/Manila' });
  }
  
  /**
   * Stop the cron job
   */
  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      logger.info('SK Terms cron job stopped');
    }
  }
  
  /**
   * Run scheduled status update (called by cron)
   */
  async runScheduledUpdate() {
    if (this.isRunning) {
      logger.warn('SK Terms status update already running, skipping');
      return;
    }

    this.isRunning = true;
    logger.info('SCHEDULED SK TERMS STATUS UPDATE STARTED');
    
    try {
      const result = await this.updateTermStatuses();
      if (result.success) {
        logger.info('SCHEDULED SK TERMS STATUS UPDATE COMPLETED', {
          activated: result.changes.activated.length,
          completed: result.changes.completed.length
        });
      } else {
        logger.error('SCHEDULED SK TERMS STATUS UPDATE FAILED', { error: result.error });
      }
    } catch (error) {
      logger.error('SCHEDULED SK TERMS STATUS UPDATE ERROR', { error: error.message, stack: error.stack });
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Get cron job status
   */
  getStatus() {
    return {
      isScheduled: this.cronJob !== null,
      isRunning: this.isRunning,
      schedule: process.env.SK_TERMS_CRON_SCHEDULE || '0 0 * * *',
      description: 'Daily at midnight (00:00)',
      nextRun: this.cronJob ? 'Based on schedule' : 'Not scheduled'
    };
  }

  /**
   * Update term statuses automatically based on current date
   * This should be called daily via cron job
   */
  async updateTermStatuses() {
    const client = await getClient();
    
    try {
      await client.query('BEGIN');
      
      const today = new Date().toISOString().split('T')[0];
      logger.info('Starting automatic term status update', { date: today });
      
      // Track changes for audit and notifications
      const changes = {
        activated: [],
        completed: [],
        errors: []
      };
      
      // 1. Update upcoming terms to active (start_date = today)
      // Also set is_current = true and is_active = true for consistency
      const activateResult = await client.query(`
        UPDATE "SK_Terms" 
        SET 
          status = 'active',
          is_current = true,
          is_active = true,
          last_status_change_at = CURRENT_TIMESTAMP,
          last_status_change_by = 'SYSTEM',
          status_change_reason = 'Automatic activation: start date reached'
        WHERE 
          status = 'upcoming' 
          AND start_date = $1
        RETURNING term_id, term_name, start_date, end_date
      `, [today]);
      
      changes.activated = activateResult.rows;
      logger.info(`Activated ${changes.activated.length} terms`, { count: changes.activated.length, terms: changes.activated.map(t => t.term_id) });
      
      // 2. Update active terms to completed (end_date < today, not <=)
      // Use strict less than so term stays active on its end date
      // Also set is_current = false and is_active = false to prevent it from being selected as active
      const completeResult = await client.query(`
        UPDATE "SK_Terms" 
        SET 
          status = 'completed',
          is_current = false,
          is_active = false,
          completion_type = 'automatic',
          completed_at = CURRENT_TIMESTAMP,
          completed_by = NULL,
          last_status_change_at = CURRENT_TIMESTAMP,
          last_status_change_by = NULL,
          status_change_reason = 'Automatic completion: end date passed'
        WHERE 
          status = 'active' 
          AND end_date < $1
        RETURNING term_id, term_name, start_date, end_date
      `, [today]);
      
      changes.completed = completeResult.rows;
      logger.info(`Completed ${changes.completed.length} terms`, { count: changes.completed.length, terms: changes.completed.map(t => t.term_id) });

      // Emit realtime events for status changes
      try {
        for (const term of changes.activated) {
          emitToAdmins('skTerm:activated', { termId: term.term_id, termName: term.term_name, startDate: term.start_date, endDate: term.end_date, at: new Date().toISOString(), by: 'SYSTEM' });
          emitToRole('staff', 'skTerm:activated', { termId: term.term_id, termName: term.term_name, startDate: term.start_date, endDate: term.end_date, at: new Date().toISOString(), by: 'SYSTEM' });
        }
        for (const term of changes.completed) {
          emitToAdmins('skTerm:completed', { termId: term.term_id, termName: term.term_name, startDate: term.start_date, endDate: term.end_date, at: new Date().toISOString(), by: 'SYSTEM', completionType: 'automatic' });
          emitToRole('staff', 'skTerm:completed', { termId: term.term_id, termName: term.term_name, startDate: term.start_date, endDate: term.end_date, at: new Date().toISOString(), by: 'SYSTEM', completionType: 'automatic' });
        }
      } catch (_) {}
      
      // 3. Update account access for officials in completed terms
      if (changes.completed.length > 0) {
        const termIds = changes.completed.map(term => term.term_id);
        
        // Disable account access for officials in completed terms
        const accountUpdateResult = await client.query(`
          UPDATE "SK_Officials" 
          SET 
            account_access = false,
            account_access_updated_at = CURRENT_TIMESTAMP,
            account_access_updated_by = NULL
          WHERE 
            term_id = ANY($1)
            AND account_access = true
          RETURNING sk_id, first_name, last_name, email, term_id
        `, [termIds]);
        
        logger.info(`Disabled account access for ${accountUpdateResult.rows.length} officials`, { count: accountUpdateResult.rows.length, termIds });
        
        // Log account access changes
        for (const official of accountUpdateResult.rows) {
                  // Log account access changes using createAuditLog directly
        await createAuditLog({
          userId: null,
          userType: 'admin',
          action: 'ACCOUNT_ACCESS_DISABLED',
          resource: 'sk-officials',
          resourceId: official.sk_id,
          details: `Account access disabled for ${official.first_name} ${official.last_name} due to term completion`,
          ipAddress: null,
          userAgent: 'SYSTEM',
          status: 'success'
        });
        }
      }
      
      // 4. Log all status changes
      for (const term of [...changes.activated, ...changes.completed]) {
        const action = changes.activated.includes(term) ? 'TERM_ACTIVATED' : 'TERM_COMPLETED';
        
        // Log term status changes using createAuditLog directly
        await createAuditLog({
          userId: null,
          userType: 'admin',
          action: action,
          resource: 'sk-terms',
          resourceId: term.term_id,
          details: `${action === 'TERM_ACTIVATED' ? 'Activated' : 'Completed'} term "${term.term_name}" automatically`,
          ipAddress: null,
          userAgent: 'SYSTEM',
          status: 'success'
        });
      }
      
      // 5. Send notifications for completed terms
      for (const term of changes.completed) {
        // Notify admin about term completion
        await universalNotificationService.sendNotificationAsync('sk-terms', 'status', {
          termId: term.term_id,
          termName: term.term_name,
          status: 'completed',
          completionType: 'automatic',
          endDate: term.end_date
        }, null, {
          oldStatus: 'active',
          newStatus: 'completed',
          reason: 'Automatic completion: end date reached'
        });
        
        // Notify officials about account access being disabled
        const officials = await client.query(`
          SELECT sk_id, first_name, last_name, email 
          FROM "SK_Officials" 
          WHERE term_id = $1
        `, [term.term_id]);
        
        for (const official of officials.rows) {
          await universalNotificationService.sendNotificationAsync('sk-officials', 'status', {
            skId: official.sk_id,
            firstName: official.first_name,
            lastName: official.last_name,
            email: official.email,
            status: 'inactive',
            reason: 'Term completed'
          }, null, {
            oldStatus: 'active',
            newStatus: 'inactive',
            reason: `Account access disabled due to term "${term.term_name}" completion`
          });
        }
      }
      
      await client.query('COMMIT');
      
      logger.info('Automatic term status update completed successfully', {
        activated: changes.activated.length,
        completed: changes.completed.length,
        summary: `${changes.activated.length} activated, ${changes.completed.length} completed`
      });
      
      return {
        success: true,
        changes,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error during automatic term status update', { error: error.message, stack: error.stack });
      
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    } finally {
      client.release();
    }
  }
  
  /**
   * Get terms that need status updates (for manual review)
   */
  async getPendingStatusUpdates() {
    const today = new Date().toISOString().split('T')[0];
    
    const result = await query(`
      SELECT 
        term_id,
        term_name,
        status,
        start_date,
        end_date,
        CASE 
          WHEN status = 'upcoming' AND start_date = $1 THEN 'needs_activation'
          WHEN status = 'active' AND end_date = $1 THEN 'needs_completion'
          ELSE 'no_change_needed'
        END as required_action
      FROM "SK_Terms"
      WHERE 
        (status = 'upcoming' AND start_date = $1) OR
        (status = 'active' AND end_date = $1)
      ORDER BY start_date, end_date
    `, [today]);
    
    return result.rows;
  }
  
  /**
   * Manual trigger for status updates (for testing or immediate updates)
   */
  async triggerManualUpdate() {
    logger.info('Manual status update triggered');
    return await this.updateTermStatuses();
  }
}

const skTermsAutoUpdateService = new SKTermsAutoUpdateService();

// Auto-start cron job when module is loaded (only in production or if enabled)
if (process.env.NODE_ENV === 'production' || process.env.ENABLE_SK_TERMS_CRON === 'true') {
  skTermsAutoUpdateService.start();
} else {
  logger.info('SK Terms cron job disabled in development', { recommendation: 'Set ENABLE_SK_TERMS_CRON=true to enable' });
}

export default skTermsAutoUpdateService;
