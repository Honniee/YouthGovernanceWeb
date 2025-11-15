import { query, getClient } from '../config/database.js';
import { generateConsentLogId } from '../utils/idGenerator.js';
import logger from '../utils/logger.js';

/**
 * Consent Service
 * Manages data privacy consent tracking
 */
class ConsentService {
  /**
   * Record consent
   */
  async recordConsent(consentData) {
    const client = await getClient();
    try {
      await client.query('BEGIN');

      // Generate consent log ID
      const consentId = await generateConsentLogId();

      const result = await client.query(
        `INSERT INTO "Consent_Logs"
         (consent_id, youth_id, email, consent_type, consent_status, consent_method, 
          ip_address, user_agent, consent_text, version, consent_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)
         RETURNING *`,
        [
          consentId,
          consentData.youthId || null,
          consentData.email || null,
          consentData.consentType || 'data_processing',
          consentData.consentStatus || 'granted',
          consentData.consentMethod || 'online_form',
          consentData.ipAddress || null,
          consentData.userAgent || null,
          consentData.consentText || null,
          consentData.version || '1.0',
        ]
      );

      await client.query('COMMIT');

      return {
        success: true,
        consent: result.rows[0],
      };
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error recording consent', { error: error.message, stack: error.stack, consentData });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Withdraw consent
   */
  async withdrawConsent(youthId, consentType, ipAddress = null, userAgent = null) {
    const client = await getClient();
    try {
      await client.query('BEGIN');

      // Update existing consent to withdrawn
      await client.query(
        `UPDATE "Consent_Logs"
         SET consent_status = 'withdrawn',
             withdrawal_date = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE youth_id = $1 
           AND consent_type = $2
           AND consent_status = 'granted'`,
        [youthId, consentType]
      );

      // Generate consent log ID for withdrawal entry
      const consentId = await generateConsentLogId();

      // Create new log entry for withdrawal
      const result = await client.query(
        `INSERT INTO "Consent_Logs"
         (consent_id, youth_id, consent_type, consent_status, consent_method,
          ip_address, user_agent, withdrawal_date)
         VALUES ($1, $2, $3, 'withdrawn', 'online_form', $4, $5, CURRENT_TIMESTAMP)
         RETURNING *`,
        [consentId, youthId, consentType, ipAddress, userAgent]
      );

      await client.query('COMMIT');

      return {
        success: true,
        consent: result.rows[0],
      };
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error withdrawing consent', { error: error.message, stack: error.stack, youthId });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Check consent status
   */
  async checkConsentStatus(youthId, consentType) {
    try {
      const result = await query(
        `SELECT consent_status, consent_date, withdrawal_date
         FROM "Consent_Logs"
         WHERE youth_id = $1 
           AND consent_type = $2
         ORDER BY consent_date DESC
         LIMIT 1`,
        [youthId, consentType]
      );

      if (result.rows.length === 0) {
        return { hasConsent: false, status: null };
      }

      const consent = result.rows[0];
      return {
        hasConsent: consent.consent_status === 'granted' && !consent.withdrawal_date,
        status: consent.consent_status,
        consentDate: consent.consent_date,
        withdrawalDate: consent.withdrawal_date,
      };
    } catch (error) {
      logger.error('Error checking consent status', { error: error.message, stack: error.stack, youthId });
      throw error;
    }
  }

  /**
   * Get consent history
   */
  async getConsentHistory(youthId) {
    try {
      const result = await query(
        `SELECT * FROM "Consent_Logs"
         WHERE youth_id = $1
         ORDER BY consent_date DESC`,
        [youthId]
      );

      return {
        success: true,
        consents: result.rows,
      };
    } catch (error) {
      logger.error('Error getting consent history', { error: error.message, stack: error.stack, youthId });
      throw error;
    }
  }
}

// Create singleton instance
const consentService = new ConsentService();

export default consentService;

