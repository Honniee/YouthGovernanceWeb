import { query, getClient } from '../config/database.js';
import notificationService from './notificationService.js';
import universalAuditService from './universalAuditService.js';
import universalNotificationService from './universalNotificationService.js';
import { createAuditLog } from '../middleware/auditLogger.js';

/**
 * Automatic SK Terms Status Update Service
 * Handles daily automatic status transitions based on dates
 */

class SKTermsAutoUpdateService {
  
  /**
   * Update term statuses automatically based on current date
   * This should be called daily via cron job
   */
  async updateTermStatuses() {
    const client = await getClient();
    
    try {
      await client.query('BEGIN');
      
      const today = new Date().toISOString().split('T')[0];
      console.log(`🔄 Starting automatic term status update for date: ${today}`);
      
      // Track changes for audit and notifications
      const changes = {
        activated: [],
        completed: [],
        errors: []
      };
      
      // 1. Update upcoming terms to active (start_date = today)
      const activateResult = await client.query(`
        UPDATE "SK_Terms" 
        SET 
          status = 'active',
          last_status_change_at = CURRENT_TIMESTAMP,
          last_status_change_by = 'SYSTEM',
          status_change_reason = 'Automatic activation: start date reached'
        WHERE 
          status = 'upcoming' 
          AND start_date = $1
        RETURNING term_id, term_name, start_date, end_date
      `, [today]);
      
      changes.activated = activateResult.rows;
      console.log(`✅ Activated ${changes.activated.length} terms`);
      
      // 2. Update active terms to completed (end_date = today)
      const completeResult = await client.query(`
        UPDATE "SK_Terms" 
        SET 
          status = 'completed',
          completion_type = 'automatic',
          completed_at = CURRENT_TIMESTAMP,
          completed_by = NULL,
          last_status_change_at = CURRENT_TIMESTAMP,
          last_status_change_by = NULL,
          status_change_reason = 'Automatic completion: end date reached'
        WHERE 
          status = 'active' 
          AND end_date <= $1
        RETURNING term_id, term_name, start_date, end_date
      `, [today]);
      
      changes.completed = completeResult.rows;
      console.log(`✅ Completed ${changes.completed.length} terms`);
      
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
        
        console.log(`🔒 Disabled account access for ${accountUpdateResult.rows.length} officials`);
        
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
      
      console.log(`🎉 Automatic term status update completed successfully`);
      console.log(`📊 Summary: ${changes.activated.length} activated, ${changes.completed.length} completed`);
      
      return {
        success: true,
        changes,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Error during automatic term status update:', error);
      
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
    console.log('🔧 Manual status update triggered');
    return await this.updateTermStatuses();
  }
}

export default new SKTermsAutoUpdateService();
