import { query, getClient } from '../config/database.js';
import emailService from './emailService.js';
import logger from '../utils/logger.js';

/**
 * Data Retention Service
 * Manages data retention policies and anonymization according to RA 10173
 */
class DataRetentionService {
  constructor() {
    this.retentionYears = parseInt(process.env.DATA_RETENTION_YEARS || '5', 10);
    this.enabled = process.env.DATA_RETENTION_ENABLED === 'true' || false;
    this.anonymizationEnabled = process.env.ANONYMIZATION_ENABLED !== 'false';
  }

  /**
   * Check and process data retention for youth profiles
   */
  async processYouthProfileRetention() {
    if (!this.enabled) {
      return { success: false, message: 'Data retention is disabled' };
    }

    const client = await getClient();
    try {
      await client.query('BEGIN');

      // Find youth profiles that should be anonymized (past retention date and not yet anonymized)
      const cutoffDate = new Date();
      cutoffDate.setFullYear(cutoffDate.getFullYear() - this.retentionYears);

      const result = await client.query(
        `SELECT youth_id, first_name, last_name, email, contact_number, created_at, last_activity_date
         FROM "Youth_Profiling"
         WHERE data_retention_date <= CURRENT_DATE
           AND anonymized_at IS NULL
           AND is_active = true
         LIMIT 100`
      );

      let anonymizedCount = 0;
      const anonymizedIds = [];

      for (const youth of result.rows) {
        await this.anonymizeYouthProfile(client, youth.youth_id);
        anonymizedIds.push(youth.youth_id);
        anonymizedCount++;
      }

      await client.query('COMMIT');

      // Log retention operations
      if (anonymizedCount > 0) {
        await this.logRetentionOperation({
          entityType: 'youth_profile',
          entityIds: anonymizedIds,
          action: 'anonymize',
          count: anonymizedCount,
        });
      }

      return {
        success: true,
        anonymizedCount,
        message: `Anonymized ${anonymizedCount} youth profiles`,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error processing youth profile retention', { error: error.message, stack: error.stack, youthId });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Check and process data retention for survey responses
   */
  async processSurveyResponseRetention() {
    if (!this.enabled) {
      return { success: false, message: 'Data retention is disabled' };
    }

    const client = await getClient();
    try {
      await client.query('BEGIN');

      // Find survey responses that should be anonymized
      const result = await client.query(
        `SELECT response_id, youth_id, created_at
         FROM "KK_Survey_Responses"
         WHERE data_retention_date <= CURRENT_DATE
           AND anonymized_at IS NULL
         LIMIT 100`
      );

      let anonymizedCount = 0;
      const anonymizedIds = [];

      for (const response of result.rows) {
        await this.anonymizeSurveyResponse(client, response.response_id);
        anonymizedIds.push(response.response_id);
        anonymizedCount++;
      }

      await client.query('COMMIT');

      // Log retention operations
      if (anonymizedCount > 0) {
        await this.logRetentionOperation({
          entityType: 'survey_response',
          entityIds: anonymizedIds,
          action: 'anonymize',
          count: anonymizedCount,
        });
      }

      return {
        success: true,
        anonymizedCount,
        message: `Anonymized ${anonymizedCount} survey responses`,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error processing survey response retention', { error: error.message, stack: error.stack, responseId });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Anonymize youth profile (remove PII, keep aggregated data)
   */
  async anonymizeYouthProfile(client, youthId) {
    if (!this.anonymizationEnabled) {
      logger.debug(`Anonymization disabled, skipping youth profile: ${youthId}`, { youthId });
      return;
    }

    // Anonymize personal information
    // Keep: age, gender, barangay_id, youth_classification (from survey responses)
    // Remove: names, email, contact_number, purok_zone
    await client.query(
      `UPDATE "Youth_Profiling"
       SET 
         first_name = 'ANONYMIZED',
         last_name = 'ANONYMIZED',
         middle_name = NULL,
         suffix = NULL,
         email = CONCAT('anonymized_', youth_id, '@anonymized.local'),
         contact_number = NULL,
         purok_zone = NULL,
         anonymized_at = CURRENT_TIMESTAMP,
         is_active = false
       WHERE youth_id = $1`,
      [youthId]
    );

    logger.info(`Anonymized youth profile: ${youthId}`, { youthId });
  }

  /**
   * Anonymize survey response (remove linked PII)
   */
  async anonymizeSurveyResponse(client, responseId) {
    if (!this.anonymizationEnabled) {
      logger.debug(`Anonymization disabled, skipping survey response: ${responseId}`, { responseId });
      return;
    }

    // Mark response as anonymized
    // The response data itself doesn't contain PII, but the link to youth_id does
    // We keep the response data for aggregated analysis
    await client.query(
      `UPDATE "KK_Survey_Responses"
       SET anonymized_at = CURRENT_TIMESTAMP
       WHERE response_id = $1`,
      [responseId]
    );

    logger.info(`Anonymized survey response: ${responseId}`, { responseId });
  }

  /**
   * Update retention dates for youth profiles based on last activity
   */
  async updateYouthRetentionDates() {
    const client = await getClient();
    try {
      // Update retention date to 5 years from last activity
      const result = await client.query(
        `UPDATE "Youth_Profiling"
         SET data_retention_date = (COALESCE(last_activity_date, created_at) + INTERVAL '5 years')::DATE
         WHERE anonymized_at IS NULL
           AND (data_retention_date IS NULL 
             OR data_retention_date < (COALESCE(last_activity_date, created_at) + INTERVAL '5 years')::DATE)`
      );

      return {
        success: true,
        updatedCount: result.rowCount,
        message: `Updated retention dates for ${result.rowCount} youth profiles`,
      };
    } catch (error) {
      logger.error('Error updating youth retention dates', { error: error.message, stack: error.stack, youthId });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update retention dates for survey responses
   */
  async updateSurveyResponseRetentionDates() {
    const client = await getClient();
    try {
      // Update retention date to 5 years from creation
      const result = await client.query(
        `UPDATE "KK_Survey_Responses"
         SET data_retention_date = (created_at + INTERVAL '5 years')::DATE
         WHERE anonymized_at IS NULL
           AND (data_retention_date IS NULL 
             OR data_retention_date < (created_at + INTERVAL '5 years')::DATE)`
      );

      return {
        success: true,
        updatedCount: result.rowCount,
        message: `Updated retention dates for ${result.rowCount} survey responses`,
      };
    } catch (error) {
      logger.error('Error updating survey response retention dates', { error: error.message, stack: error.stack, responseId });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update last activity date for a youth profile
   */
  async updateLastActivityDate(youthId) {
    try {
      await query(
        `UPDATE "Youth_Profiling"
         SET last_activity_date = CURRENT_TIMESTAMP,
             data_retention_date = (CURRENT_TIMESTAMP + INTERVAL '5 years')::DATE
         WHERE youth_id = $1
           AND anonymized_at IS NULL`,
        [youthId]
      );
    } catch (error) {
      logger.error('Error updating last activity date', { error: error.message, stack: error.stack, youthId });
      // Don't throw - this is not critical
    }
  }

  /**
   * Get retention statistics
   */
  async getRetentionStatistics() {
    try {
      const [youthStats, surveyStats, logsStats] = await Promise.all([
        // Youth profiles pending anonymization
        query(
          `SELECT 
             COUNT(*) as total,
             COUNT(*) FILTER (WHERE data_retention_date <= CURRENT_DATE AND anonymized_at IS NULL) as pending_anonymization,
             COUNT(*) FILTER (WHERE anonymized_at IS NOT NULL) as anonymized
           FROM "Youth_Profiling"`
        ),
        // Survey responses pending anonymization
        query(
          `SELECT 
             COUNT(*) as total,
             COUNT(*) FILTER (WHERE data_retention_date <= CURRENT_DATE AND anonymized_at IS NULL) as pending_anonymization,
             COUNT(*) FILTER (WHERE anonymized_at IS NOT NULL) as anonymized
           FROM "KK_Survey_Responses"`
        ),
        // Recent retention operations
        query(
          `SELECT 
             COUNT(*) as total_operations,
             COUNT(*) FILTER (WHERE action = 'anonymize') as anonymizations,
             MAX(performed_at) as last_operation
           FROM "Data_Retention_Logs"
           WHERE performed_at >= CURRENT_DATE - INTERVAL '30 days'`
        ),
      ]);

      return {
        success: true,
        data: {
          youthProfiles: {
            total: parseInt(youthStats.rows[0].total, 10),
            pendingAnonymization: parseInt(youthStats.rows[0].pending_anonymization, 10),
            anonymized: parseInt(youthStats.rows[0].anonymized, 10),
          },
          surveyResponses: {
            total: parseInt(surveyStats.rows[0].total, 10),
            pendingAnonymization: parseInt(surveyStats.rows[0].pending_anonymization, 10),
            anonymized: parseInt(surveyStats.rows[0].anonymized, 10),
          },
          recentOperations: {
            totalOperations: parseInt(logsStats.rows[0].total_operations, 10),
            anonymizations: parseInt(logsStats.rows[0].anonymizations, 10),
            lastOperation: logsStats.rows[0].last_operation,
          },
          retentionYears: this.retentionYears,
          enabled: this.enabled,
        },
      };
    } catch (error) {
      logger.error('Error getting retention statistics', { error: error.message, stack: error.stack });
      throw error;
    }
  }

  /**
   * Log retention operation
   */
  async logRetentionOperation(operation) {
    try {
      for (const entityId of operation.entityIds) {
        await query(
          `INSERT INTO "Data_Retention_Logs"
           (entity_type, entity_id, action, retention_date, performed_at, details)
           VALUES ($1, $2, $3, CURRENT_DATE, CURRENT_TIMESTAMP, $4)`,
          [
            operation.entityType,
            entityId,
            operation.action,
            JSON.stringify({
              count: operation.count,
              retentionYears: this.retentionYears,
            }),
          ]
        );
      }
    } catch (error) {
      logger.error('Error logging retention operation', { error: error.message, stack: error.stack });
      // Don't throw - logging failure shouldn't break the operation
    }
  }

  /**
   * Process all retention checks
   */
  async processRetentionChecks() {
    if (!this.enabled) {
      return { success: false, message: 'Data retention is disabled' };
    }

    try {
      logger.info('Starting data retention checks');

      // Update retention dates first
      await this.updateYouthRetentionDates();
      await this.updateSurveyResponseRetentionDates();

      // Process anonymization
      const youthResult = await this.processYouthProfileRetention();
      const surveyResult = await this.processSurveyResponseRetention();

      const totalAnonymized = (youthResult.anonymizedCount || 0) + (surveyResult.anonymizedCount || 0);

      // Send notification if significant anonymization occurred
      if (totalAnonymized > 0 && process.env.DATA_RETENTION_NOTIFICATION_EMAIL) {
        await this.sendRetentionNotification(totalAnonymized, youthResult.anonymizedCount || 0, surveyResult.anonymizedCount || 0);
      }

      return {
        success: true,
        youthProfiles: youthResult,
        surveyResponses: surveyResult,
        totalAnonymized,
      };
    } catch (error) {
      logger.error('Error processing retention checks', { error: error.message, stack: error.stack });
      throw error;
    }
  }

  /**
   * Send retention notification email
   */
  async sendRetentionNotification(totalAnonymized, youthCount, surveyCount) {
    if (!process.env.DATA_RETENTION_NOTIFICATION_EMAIL) return;

    try {
      await emailService.sendEmail({
        to: process.env.DATA_RETENTION_NOTIFICATION_EMAIL,
        subject: 'Data Retention Processing Completed',
        html: `
          <h2>Data Retention Processing Completed</h2>
          <p><strong>Date:</strong> ${new Date().toISOString()}</p>
          <p><strong>Total Anonymized:</strong> ${totalAnonymized}</p>
          <ul>
            <li>Youth Profiles: ${youthCount}</li>
            <li>Survey Responses: ${surveyCount}</li>
          </ul>
          <p>This is an automated notification from the data retention system.</p>
        `,
      });
    } catch (error) {
      logger.error('Failed to send retention notification', { error: error.message, stack: error.stack });
    }
  }
}

// Create singleton instance
const dataRetentionService = new DataRetentionService();

export default dataRetentionService;

