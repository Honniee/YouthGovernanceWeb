import { query, getClient } from '../config/database.js';
import emailService from './emailService.js';
import logger from '../utils/logger.js';

/**
 * Security Incident Service
 * Manages security incident tracking and response
 */
class SecurityIncidentService {
  constructor() {
    this.incidentTypes = [
      'data_breach',
      'system_compromise',
      'denial_of_service',
      'unauthorized_access',
      'physical_security',
      'other',
    ];

    this.severityLevels = ['critical', 'high', 'medium', 'low'];
    this.statusTypes = ['reported', 'investigating', 'contained', 'resolved', 'closed'];
  }

  /**
   * Create a new security incident
   */
  async createIncident(incidentData, reportedBy) {
    const client = await getClient();
    try {
      await client.query('BEGIN');

      // Generate incident ID
      const incidentId = await this.generateIncidentId();

      // Insert incident
      const result = await client.query(
        `INSERT INTO "Security_Incidents"
         (incident_id, incident_type, severity, status, title, description, 
          affected_systems, affected_data, reported_by, reported_at, details)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, $10)
         RETURNING *`,
        [
          incidentId,
          incidentData.incidentType,
          incidentData.severity,
          'reported',
          incidentData.title,
          incidentData.description,
          JSON.stringify(incidentData.affectedSystems || []),
          JSON.stringify(incidentData.affectedData || []),
          reportedBy,
          JSON.stringify(incidentData.details || {}),
        ]
      );

      const incident = result.rows[0];

      await client.query('COMMIT');

      // Send notification for critical/high severity incidents
      if (['critical', 'high'].includes(incidentData.severity)) {
        await this.sendIncidentNotification(incident);
      }

      return {
        success: true,
        incident,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error creating security incident', { error: error.message, stack: error.stack, incidentData });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update incident status
   */
  async updateIncidentStatus(incidentId, status, updatedBy, notes = null) {
    try {
      const result = await query(
        `UPDATE "Security_Incidents"
         SET status = $1, updated_by = $2, updated_at = CURRENT_TIMESTAMP,
             status_notes = COALESCE($3, status_notes)
         WHERE incident_id = $4
         RETURNING *`,
        [status, updatedBy, notes, incidentId]
      );

      if (result.rows.length === 0) {
        return { success: false, message: 'Incident not found' };
      }

      const incident = result.rows[0];

      // Send notification for critical status changes
      if (incident.severity === 'critical' && status === 'contained') {
        await this.sendIncidentNotification(incident, 'contained');
      }

      return {
        success: true,
        incident,
      };
    } catch (error) {
      logger.error('Error updating incident status', { error: error.message, stack: error.stack, incidentId, status });
      throw error;
    }
  }

  /**
   * Add incident update/log
   */
  async addIncidentUpdate(incidentId, update, updatedBy) {
    try {
      await query(
        `INSERT INTO "Security_Incident_Logs"
         (incident_id, log_entry, logged_by, logged_at)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP)`,
        [incidentId, update, updatedBy]
      );

      return { success: true };
    } catch (error) {
      logger.error('Error adding incident update', { error: error.message, stack: error.stack, incidentId });
      throw error;
    }
  }

  /**
   * Get incident by ID
   */
  async getIncident(incidentId) {
    try {
      const result = await query(
        `SELECT si.*, 
                CASE 
                  WHEN u.user_type = 'lydo_staff' THEN COALESCE(l.first_name || ' ' || l.last_name, 'LYDO Staff')
                  WHEN u.user_type = 'admin' THEN COALESCE(l.first_name || ' ' || l.last_name, 'Admin')
                  WHEN u.user_type = 'sk_official' THEN COALESCE(sk.first_name || ' ' || sk.last_name, 'SK Official')
                  ELSE 'User'
                END as reported_by_name
         FROM "Security_Incidents" si
         LEFT JOIN "Users" u ON si.reported_by = u.user_id
         LEFT JOIN "LYDO" l ON u.lydo_id = l.lydo_id
         LEFT JOIN "SK_Officials" sk ON u.sk_id = sk.sk_id
         WHERE si.incident_id = $1`,
        [incidentId]
      );

      if (result.rows.length === 0) {
        return { success: false, message: 'Incident not found' };
      }

      const incident = result.rows[0];

      // Get incident logs
      const logsResult = await query(
        `SELECT * FROM "Security_Incident_Logs"
         WHERE incident_id = $1
         ORDER BY logged_at DESC`,
        [incidentId]
      );

      incident.logs = logsResult.rows;

      return {
        success: true,
        incident,
      };
    } catch (error) {
      logger.error('Error getting incident', { error: error.message, stack: error.stack, incidentId });
      throw error;
    }
  }

  /**
   * List incidents with filters
   */
  async listIncidents(filters = {}) {
    try {
      let queryText = `
        SELECT si.*, 
               CASE 
                 WHEN u.user_type = 'lydo_staff' THEN COALESCE(l.first_name || ' ' || l.last_name, 'LYDO Staff')
                 WHEN u.user_type = 'admin' THEN COALESCE(l.first_name || ' ' || l.last_name, 'Admin')
                 WHEN u.user_type = 'sk_official' THEN COALESCE(sk.first_name || ' ' || sk.last_name, 'SK Official')
                 ELSE 'User'
               END as reported_by_name
        FROM "Security_Incidents" si
        LEFT JOIN "Users" u ON si.reported_by = u.user_id
        LEFT JOIN "LYDO" l ON u.lydo_id = l.lydo_id
        LEFT JOIN "SK_Officials" sk ON u.sk_id = sk.sk_id
        WHERE 1=1
      `;
      const params = [];
      let paramCount = 0;

      if (filters.status) {
        paramCount++;
        queryText += ` AND si.status = $${paramCount}`;
        params.push(filters.status);
      }

      if (filters.severity) {
        paramCount++;
        queryText += ` AND si.severity = $${paramCount}`;
        params.push(filters.severity);
      }

      if (filters.incidentType) {
        paramCount++;
        queryText += ` AND si.incident_type = $${paramCount}`;
        params.push(filters.incidentType);
      }

      if (filters.startDate) {
        paramCount++;
        queryText += ` AND si.reported_at >= $${paramCount}`;
        params.push(filters.startDate);
      }

      if (filters.endDate) {
        paramCount++;
        queryText += ` AND si.reported_at <= $${paramCount}`;
        params.push(filters.endDate);
      }

      queryText += ` ORDER BY si.reported_at DESC LIMIT $${paramCount + 1}`;
      params.push(filters.limit || 100);

      const result = await query(queryText, params);

      return {
        success: true,
        incidents: result.rows,
        count: result.rows.length,
      };
    } catch (error) {
      logger.error('Error listing incidents', { error: error.message, stack: error.stack });
      throw error;
    }
  }

  /**
   * Get incident statistics
   */
  async getIncidentStatistics() {
    try {
      const [totalStats, severityStats, statusStats, typeStats] = await Promise.all([
        // Total incidents
        query(`SELECT COUNT(*) as total FROM "Security_Incidents"`),
        // By severity
        query(
          `SELECT severity, COUNT(*) as count
           FROM "Security_Incidents"
           GROUP BY severity`
        ),
        // By status
        query(
          `SELECT status, COUNT(*) as count
           FROM "Security_Incidents"
           GROUP BY status`
        ),
        // By type
        query(
          `SELECT incident_type, COUNT(*) as count
           FROM "Security_Incidents"
           GROUP BY incident_type`
        ),
      ]);

      return {
        success: true,
        data: {
          total: parseInt(totalStats.rows[0].total, 10),
          bySeverity: severityStats.rows.reduce((acc, row) => {
            acc[row.severity] = parseInt(row.count, 10);
            return acc;
          }, {}),
          byStatus: statusStats.rows.reduce((acc, row) => {
            acc[row.status] = parseInt(row.count, 10);
            return acc;
          }, {}),
          byType: typeStats.rows.reduce((acc, row) => {
            acc[row.incident_type] = parseInt(row.count, 10);
            return acc;
          }, {}),
        },
      };
    } catch (error) {
      logger.error('Error getting incident statistics', { error: error.message, stack: error.stack });
      throw error;
    }
  }

  /**
   * Generate incident ID
   */
  async generateIncidentId() {
    try {
      const result = await query(
        `SELECT COUNT(*) as count FROM "Security_Incidents"
         WHERE reported_at >= CURRENT_DATE`
      );

      const count = parseInt(result.rows[0].count, 10) + 1;
      const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
      return `INC-${date}-${String(count).padStart(4, '0')}`;
    } catch (error) {
      // Fallback if table doesn't exist
      const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const random = Math.floor(Math.random() * 10000);
      return `INC-${date}-${String(random).padStart(4, '0')}`;
    }
  }

  /**
   * Send incident notification
   */
  async sendIncidentNotification(incident, action = 'reported') {
    const notificationEmail = process.env.SECURITY_INCIDENT_NOTIFICATION_EMAIL || 
                             process.env.EMAIL_USER;

    if (!notificationEmail) return;

    try {
      const subject = action === 'reported' 
        ? `Security Incident ${incident.severity.toUpperCase()}: ${incident.title}`
        : `Security Incident Update: ${incident.title}`;

      await emailService.sendEmail({
        to: notificationEmail,
        subject,
        html: `
          <h2>Security Incident ${action === 'reported' ? 'Reported' : 'Update'}</h2>
          <p><strong>Incident ID:</strong> ${incident.incident_id}</p>
          <p><strong>Severity:</strong> ${incident.severity.toUpperCase()}</p>
          <p><strong>Type:</strong> ${incident.incident_type}</p>
          <p><strong>Status:</strong> ${incident.status}</p>
          <p><strong>Title:</strong> ${incident.title}</p>
          <p><strong>Description:</strong></p>
          <p>${incident.description}</p>
          <p><strong>Reported At:</strong> ${new Date(incident.reported_at).toISOString()}</p>
          <p>Please review and take appropriate action.</p>
        `,
      });
    } catch (error) {
      logger.error('Failed to send incident notification', { error: error.message, stack: error.stack, incidentId: incident.incident_id });
    }
  }
}

// Create singleton instance
const securityIncidentService = new SecurityIncidentService();

export default securityIncidentService;

