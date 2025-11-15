import { query, getClient } from '../config/database.js';
import emailService from './emailService.js';
import consentService from './consentService.js';
import dataRetentionService from './dataRetentionService.js';
import TokenGenerator from '../utils/tokenGenerator.js';
import { generateDataSubjectRequestId } from '../utils/idGenerator.js';
import logger from '../utils/logger.js';

/**
 * Data Subject Rights Service
 * Manages data subject rights requests under RA 10173
 */
class DataSubjectRightsService {
  constructor() {
    this.requestTypes = [
      'access',
      'rectification',
      'erasure',
      'portability',
      'object',
      'consent_withdrawal',
    ];

    this.requestStatuses = ['pending', 'in_progress', 'completed', 'rejected', 'cancelled'];
    this.responseDays = 30; // RA 10173 requires response within 30 days
  }

  /**
   * Create a new data subject rights request
   */
  async createRequest(requestData, ipAddress = null, userAgent = null) {
    const client = await getClient();
    try {
      await client.query('BEGIN');

      const youthIdRaw = requestData.youthId || '';
      const youthId = youthIdRaw.trim().toUpperCase();
      const requesterEmailRaw = requestData.requesterEmail || '';
      const requesterEmail = requesterEmailRaw.trim().toLowerCase();
      const contactEmailRaw = requestData.email || requestData.requesterEmail || '';
      const contactEmail = contactEmailRaw.trim().toLowerCase();

      // Validate required fields
      if (!youthId) {
        throw new Error('Youth ID is required. You can find it in your survey confirmation email.');
      }

      if (!requesterEmail) {
        throw new Error('Email is required for data subject rights requests.');
      }

      // Verify youth profile exists and matches provided information (anti-spam protection)
      // First check if youth exists (regardless of status)
      const youthExistsCheck = await client.query(
        `SELECT youth_id, email, first_name, last_name, middle_name, suffix, is_active, anonymized_at
         FROM "Youth_Profiling"
         WHERE youth_id = $1`,
        [youthId]
      );

      if (youthExistsCheck.rows.length === 0) {
        logger.warn(`Youth ID not found: ${requestData.youthId}`, { youthId: requestData.youthId });
        throw new Error(`Youth ID "${requestData.youthId}" not found. Please verify your Youth ID from your survey confirmation email.`);
      }

      const youthProfile = youthExistsCheck.rows[0];

      // Check if profile is inactive
      if (youthProfile.is_active === false) {
        logger.warn(`Youth profile is inactive: ${requestData.youthId}`, { youthId: requestData.youthId });
        throw new Error('This Youth ID belongs to an inactive profile. Please contact the Data Protection Officer for assistance.');
      }

      // Check if profile is anonymized
      if (youthProfile.anonymized_at !== null) {
        logger.warn(`Youth profile is anonymized: ${requestData.youthId}`, { youthId: requestData.youthId });
        throw new Error('This Youth ID belongs to an anonymized profile. Data subject rights may be limited for anonymized data. Please contact the Data Protection Officer for assistance.');
      }

      // Verify email matches youth profile (case-insensitive)
      const profileEmail = (youthProfile.email || '').trim().toLowerCase();
      if (profileEmail !== requesterEmail) {
        throw new Error('Email does not match the Youth ID. Please use the email address associated with your Youth ID.');
      }

      const requesterNameParts = [
        youthProfile.first_name,
        youthProfile.middle_name,
        youthProfile.last_name,
        youthProfile.suffix,
      ].filter(part => part && part.trim() !== '');
      const requesterNameCombined = requesterNameParts.join(' ').replace(/\s+/g, ' ').trim();
      const requesterName =
        requesterNameCombined ||
        (youthProfile.first_name ? youthProfile.first_name.trim() : requestData.requesterEmail);

      // Check for existing active requests (pending/in progress) from same youth (prevent duplicates)
      const duplicateCheck = await client.query(
        `SELECT request_id, request_type, request_status, requested_at
         FROM "Data_Subject_Requests"
         WHERE youth_id = $1
           AND requester_email = $2
           AND request_status IN ('pending', 'in_progress')
         ORDER BY requested_at DESC
         LIMIT 1`,
        [youthId, requesterEmail]
      );

      if (duplicateCheck.rows.length > 0) {
        const duplicate = duplicateCheck.rows[0];
        const duplicateTypeLabel = (duplicate.request_type || '')
          .replace(/_/g, ' ')
          .replace(/\b\w/g, (char) => char.toUpperCase());

        throw new Error(
          `You already have a ${duplicate.request_status.replace('_', ' ')} ${duplicateTypeLabel} request submitted on ${new Date(duplicate.requested_at).toLocaleString()}. ` +
          `Please wait for it to be processed or contact the Data Protection Officer if you need to update your existing request.`
        );
      }

      // Calculate due date (30 days from now)
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + this.responseDays);

      // Generate request reference
      const requestRef = await this.generateRequestReference(requestData.requestType);

      // Generate request ID
      const requestId = await generateDataSubjectRequestId();

      // Generate secure access token for email links (72 hour expiration)
      const tokenData = TokenGenerator.generateTokenWithExpiration(72);
      const tokenHash = TokenGenerator.hashToken(tokenData.token);

      // Insert request (only store hash, not plain token for security)
      const result = await client.query(
        `INSERT INTO "Data_Subject_Requests"
         (request_id, request_type, request_status, requester_name, requester_email, requester_phone,
          youth_id, email, request_description, request_details, due_date,
          requested_by_ip, requested_by_user_agent, access_token_hash, access_token_expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
         RETURNING *`,
        [
          requestId,
          requestData.requestType,
          'pending',
          requesterName,
          requesterEmail,
          null,
          youthId, // Youth ID is now required
          contactEmail || requesterEmail,
          requestData.requestDescription,
          JSON.stringify(requestData.requestDetails || {}),
          dueDate,
          ipAddress,
          userAgent,
          tokenHash, // Store only hashed token for verification
          tokenData.expiresAt,
        ]
      );

      const request = result.rows[0];

      await client.query('COMMIT');

      // Log request creation
      await this.addRequestLog(request.request_id, 'Request created', 'SYSTEM', {
        requestType: requestData.requestType,
        requesterEmail,
      });

      // Add requestRef to request object for email
      request.requestRef = requestRef;

      // Send confirmation email to requester with access token
      await this.sendRequestConfirmationEmail(request, tokenData.token);

      // Notify DPO of new request
      await this.notifyDPO(request);

      return {
        success: true,
        request,
        requestRef,
        accessToken: tokenData.token, // Return token for immediate use (e.g., redirect)
      };
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error creating data subject rights request', { error: error.message, stack: error.stack, requestData: requestData?.requestType });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get request by ID
   */
  async getRequest(requestId, accessToken = null) {
    try {
      let queryText = `
        SELECT dsr.*, 
               CASE 
                 WHEN u.user_type = 'lydo_staff' THEN COALESCE(l.first_name || ' ' || l.last_name, 'LYDO Staff')
                 WHEN u.user_type = 'admin' THEN COALESCE(l.first_name || ' ' || l.last_name, 'Admin')
                 WHEN u.user_type = 'sk_official' THEN COALESCE(sk.first_name || ' ' || sk.last_name, 'SK Official')
                 ELSE 'User'
               END as assigned_to_name,
               yp.first_name || ' ' || yp.last_name as youth_name
        FROM "Data_Subject_Requests" dsr
        LEFT JOIN "Users" u ON dsr.assigned_to = u.user_id
        LEFT JOIN "LYDO" l ON u.lydo_id = l.lydo_id
        LEFT JOIN "SK_Officials" sk ON u.sk_id = sk.sk_id
        LEFT JOIN "Youth_Profiling" yp ON dsr.youth_id = yp.youth_id
        WHERE dsr.request_id = $1
      `;
      const params = [requestId];

      // If access token provided, verify it
      if (accessToken) {
        const tokenHash = TokenGenerator.hashToken(accessToken);
        queryText += ` AND dsr.access_token_hash = $2`;
        params.push(tokenHash);
      }

      const result = await query(queryText, params);

      if (result.rows.length === 0) {
        return { success: false, message: 'Request not found or invalid access token' };
      }

      const request = result.rows[0];

      // Check if token is expired (if using token access)
      if (accessToken && request.access_token_expires_at) {
        if (TokenGenerator.isTokenExpired(request.access_token_expires_at)) {
          return { success: false, message: 'Access token has expired. Please request a new access link.' };
        }
      }

      // Get request logs
      const logsResult = await query(
        `SELECT * FROM "Data_Subject_Request_Logs"
         WHERE request_id = $1
         ORDER BY logged_at DESC`,
        [requestId]
      );

      request.logs = logsResult.rows;

      // Remove sensitive token hash from response (never send hash to client)
      delete request.access_token_hash;

      return {
        success: true,
        request,
      };
    } catch (error) {
      logger.error('Error getting request', { error: error.message, stack: error.stack, requestId });
      throw error;
    }
  }

  /**
   * Get request by access token
   */
  async getRequestByToken(accessToken) {
    try {
      const tokenHash = TokenGenerator.hashToken(accessToken);

      const result = await query(
        `SELECT request_id FROM "Data_Subject_Requests"
         WHERE access_token_hash = $1`,
        [tokenHash]
      );

      if (result.rows.length === 0) {
        return { success: false, message: 'Invalid access token' };
      }

      const requestId = result.rows[0].request_id;
      return await this.getRequest(requestId, accessToken);
    } catch (error) {
      logger.error('Error getting request by token', { error: error.message, stack: error.stack });
      throw error;
    }
  }

  /**
   * Generate new access token for request
   */
  async regenerateAccessToken(requestId) {
    try {
      const tokenData = TokenGenerator.generateTokenWithExpiration(72);
      const tokenHash = TokenGenerator.hashToken(tokenData.token);

      await query(
        `UPDATE "Data_Subject_Requests"
         SET access_token_hash = $1,
             access_token_expires_at = $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE request_id = $3`,
        [tokenHash, tokenData.expiresAt, requestId]
      );

      return {
        success: true,
        token: tokenData.token,
        expiresAt: tokenData.expiresAt,
      };
    } catch (error) {
      logger.error('Error regenerating access token', { error: error.message, stack: error.stack, requestId });
      throw error;
    }
  }

  /**
   * List requests with filters
   */
  async listRequests(filters = {}) {
    try {
      let queryText = `
        SELECT dsr.*, 
               CASE 
                 WHEN u.user_type = 'lydo_staff' THEN COALESCE(l.first_name || ' ' || l.last_name, 'LYDO Staff')
                 WHEN u.user_type = 'admin' THEN COALESCE(l.first_name || ' ' || l.last_name, 'Admin')
                 WHEN u.user_type = 'sk_official' THEN COALESCE(sk.first_name || ' ' || sk.last_name, 'SK Official')
                 ELSE 'User'
               END as assigned_to_name,
               yp.first_name || ' ' || yp.last_name as youth_name
        FROM "Data_Subject_Requests" dsr
        LEFT JOIN "Users" u ON dsr.assigned_to = u.user_id
        LEFT JOIN "LYDO" l ON u.lydo_id = l.lydo_id
        LEFT JOIN "SK_Officials" sk ON u.sk_id = sk.sk_id
        LEFT JOIN "Youth_Profiling" yp ON dsr.youth_id = yp.youth_id
        WHERE 1=1
      `;
      const params = [];
      let paramCount = 0;

      if (filters.requestType) {
        paramCount++;
        queryText += ` AND dsr.request_type = $${paramCount}`;
        params.push(filters.requestType);
      }

      if (filters.requestStatus) {
        paramCount++;
        queryText += ` AND dsr.request_status = $${paramCount}`;
        params.push(filters.requestStatus);
      }

      if (filters.youthId) {
        paramCount++;
        queryText += ` AND dsr.youth_id = $${paramCount}`;
        params.push(filters.youthId);
      }

      if (filters.email) {
        paramCount++;
        queryText += ` AND (dsr.requester_email = $${paramCount} OR dsr.email = $${paramCount})`;
        params.push(filters.email);
      }

      if (filters.startDate) {
        paramCount++;
        queryText += ` AND dsr.requested_at >= $${paramCount}`;
        params.push(filters.startDate);
      }

      if (filters.endDate) {
        paramCount++;
        queryText += ` AND dsr.requested_at <= $${paramCount}`;
        params.push(filters.endDate);
      }

      queryText += ` ORDER BY dsr.requested_at DESC LIMIT $${paramCount + 1}`;
      params.push(filters.limit || 100);

      const result = await query(queryText, params);

      return {
        success: true,
        requests: result.rows,
        count: result.rows.length,
      };
    } catch (error) {
      logger.error('Error listing requests', { error: error.message, stack: error.stack });
      throw error;
    }
  }

  /**
   * Update request status
   */
  async updateRequestStatus(requestId, status, updatedBy, notes = null) {
    const client = await getClient();
    try {
      await client.query('BEGIN');

      const updateData = {
        request_status: status,
        updated_at: new Date(),
      };

      if (status === 'completed') {
        updateData.completed_at = new Date();
      } else if (status === 'rejected') {
        updateData.rejected_at = new Date();
      }

      if (notes) {
        updateData.notes = notes;
      }

      const result = await query(
        `UPDATE "Data_Subject_Requests"
         SET request_status = $1, updated_at = CURRENT_TIMESTAMP,
             completed_at = CASE WHEN $1 = 'completed' THEN CURRENT_TIMESTAMP ELSE completed_at END,
             rejected_at = CASE WHEN $1 = 'rejected' THEN CURRENT_TIMESTAMP ELSE rejected_at END,
             notes = COALESCE($3, notes)
         WHERE request_id = $2
         RETURNING *`,
        [status, requestId, notes]
      );

      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return { success: false, message: 'Request not found' };
      }

      const request = result.rows[0];

      await client.query('COMMIT');

      // Log status update
      await this.addRequestLog(requestId, `Status updated to ${status}`, updatedBy, {
        status,
        notes,
      });

      // Send notification email
      await this.sendStatusUpdateEmail(request);

      return {
        success: true,
        request,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error updating request status', { error: error.message, stack: error.stack, requestId, status });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Find youth by email (for requests without youth_id)
   */
  async findYouthByEmail(email) {
    try {
      const result = await query(
        `SELECT youth_id FROM "Youth_Profiling"
         WHERE email = $1 AND anonymized_at IS NULL
         ORDER BY created_at DESC
         LIMIT 1`,
        [email]
      );

      return result.rows.length > 0 ? result.rows[0].youth_id : null;
    } catch (error) {
      logger.error('Error finding youth by email', { error: error.message, stack: error.stack, email });
      return null;
    }
  }

  /**
   * Process access request - gather all user data
   */
  async processAccessRequest(requestId, processedBy) {
    try {
      const requestResult = await this.getRequest(requestId);
      if (!requestResult.success) {
        return { success: false, message: 'Request not found' };
      }

      const request = requestResult.request;

      // Try to find youth_id if not provided
      let youthId = request.youth_id;
      if (!youthId && request.email) {
        youthId = await this.findYouthByEmail(request.email);
        if (youthId) {
          // Update request with found youth_id
          await query(
            `UPDATE "Data_Subject_Requests" SET youth_id = $1 WHERE request_id = $2`,
            [youthId, requestId]
          );
        }
      }

      if (!youthId) {
        return { success: false, message: 'Youth profile not found. Please provide your email address used during registration.' };
      }

      // Gather all user data
      const userData = await this.gatherUserData(youthId);

      // Update request with response data
      await query(
        `UPDATE "Data_Subject_Requests"
         SET response_data = $1,
             response_text = 'Your personal data has been compiled and is ready for review.',
             request_status = 'completed',
             completed_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE request_id = $2`,
        [JSON.stringify(userData), requestId]
      );

      // Log processing
      await this.addRequestLog(requestId, 'Access request processed - data compiled', processedBy, {
        dataCompiled: true,
      });

      // Send data to requester
      await this.sendAccessDataEmail(request, userData);

      return {
        success: true,
        userData,
      };
    } catch (error) {
      logger.error('Error processing access request', { error: error.message, stack: error.stack, requestId });
      throw error;
    }
  }

  /**
   * Process rectification request - update user data
   */
  async processRectificationRequest(requestId, corrections, processedBy) {
    try {
      const requestResult = await this.getRequest(requestId);
      if (!requestResult.success) {
        return { success: false, message: 'Request not found' };
      }

      const request = requestResult.request;

      // Try to find youth_id if not provided
      let youthId = request.youth_id;
      if (!youthId && request.email) {
        youthId = await this.findYouthByEmail(request.email);
        if (youthId) {
          await query(
            `UPDATE "Data_Subject_Requests" SET youth_id = $1 WHERE request_id = $2`,
            [youthId, requestId]
          );
        }
      }

      if (!youthId) {
        return { success: false, message: 'Youth profile not found. Please provide your email address used during registration.' };
      }

      const client = await getClient();
      try {
        await client.query('BEGIN');

        // Update youth profile with corrections
        const updateFields = [];
        const updateValues = [];
        let paramCount = 1;

        if (corrections.firstName) {
          updateFields.push(`first_name = $${paramCount++}`);
          updateValues.push(corrections.firstName);
        }
        if (corrections.lastName) {
          updateFields.push(`last_name = $${paramCount++}`);
          updateValues.push(corrections.lastName);
        }
        if (corrections.email) {
          updateFields.push(`email = $${paramCount++}`);
          updateValues.push(corrections.email);
        }
        if (corrections.contactNumber) {
          updateFields.push(`contact_number = $${paramCount++}`);
          updateValues.push(corrections.contactNumber);
        }
        if (corrections.barangayId) {
          updateFields.push(`barangay_id = $${paramCount++}`);
          updateValues.push(corrections.barangayId);
        }

        if (updateFields.length > 0) {
          updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
          updateValues.push(youthId);

          await client.query(
            `UPDATE "Youth_Profiling"
             SET ${updateFields.join(', ')}
             WHERE youth_id = $${paramCount}
             RETURNING *`,
            updateValues
          );
        }

        // Update request status
        await client.query(
          `UPDATE "Data_Subject_Requests"
           SET request_status = 'completed',
               completed_at = CURRENT_TIMESTAMP,
               response_text = 'Your personal data has been corrected as requested.',
               updated_at = CURRENT_TIMESTAMP
           WHERE request_id = $1`,
          [requestId]
        );

        await client.query('COMMIT');

        // Log processing
        await this.addRequestLog(requestId, 'Rectification request processed - data updated', processedBy, {
          corrections,
        });

        // Send confirmation email
        await this.sendRectificationConfirmationEmail(request, corrections);

        return {
          success: true,
          message: 'Data rectification completed',
        };
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      logger.error('Error processing rectification request', { error: error.message, stack: error.stack, requestId });
      throw error;
    }
  }

  /**
   * Process erasure request - delete user data (subject to retention)
   */
  async processErasureRequest(requestId, processedBy) {
    try {
      const requestResult = await this.getRequest(requestId);
      if (!requestResult.success) {
        return { success: false, message: 'Request not found' };
      }

      const request = requestResult.request;

      // Try to find youth_id if not provided
      let youthId = request.youth_id;
      if (!youthId && request.email) {
        youthId = await this.findYouthByEmail(request.email);
        if (youthId) {
          await query(
            `UPDATE "Data_Subject_Requests" SET youth_id = $1 WHERE request_id = $2`,
            [youthId, requestId]
          );
        }
      }

      if (!youthId) {
        return { success: false, message: 'Youth profile not found. Please provide your email address used during registration.' };
      }

      // Check if data is within retention period
      const youthResult = await query(
        `SELECT data_retention_date, anonymized_at FROM "Youth_Profiling"
         WHERE youth_id = $1`,
        [youthId]
      );

      if (youthResult.rows.length === 0) {
        return { success: false, message: 'Youth profile not found' };
      }

      const youth = youthResult.rows[0];
      const retentionDate = new Date(youth.data_retention_date);
      const now = new Date();

      if (now < retentionDate) {
        // Data is still within retention period - cannot delete, but can anonymize
        // Update request to indicate limitation
        await query(
          `UPDATE "Data_Subject_Requests"
           SET request_status = 'completed',
               completed_at = CURRENT_TIMESTAMP,
               response_text = 'Your data deletion request has been processed. However, due to legal retention requirements, your data will be anonymized instead of deleted until the retention period expires. Your data will be fully deleted after ${retentionDate.toLocaleDateString()}.',
               updated_at = CURRENT_TIMESTAMP
           WHERE request_id = $1`,
          [requestId]
        );

        // Anonymize the data
        const client = await getClient();
        try {
          await client.query('BEGIN');
          await client.query(
            `UPDATE "Youth_Profiling"
             SET first_name = 'ANONYMIZED',
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
          await client.query('COMMIT');
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        } finally {
          client.release();
        }

        await this.addRequestLog(requestId, 'Erasure request processed - data anonymized due to retention', processedBy, {
          retentionDate: retentionDate.toISOString(),
          anonymized: true,
        });

        return {
          success: true,
          message: 'Data anonymized (retention period active)',
          retentionDate: retentionDate.toISOString(),
        };
      } else {
        // Retention period has passed - can delete
        const client = await getClient();
        try {
          await client.query('BEGIN');

          // Delete survey responses
          await client.query(
            `DELETE FROM "KK_Survey_Responses" WHERE youth_id = $1`,
            [youthId]
          );

          // Delete user account
          await client.query(
            `DELETE FROM "Users" WHERE youth_id = $1`,
            [youthId]
          );

          // Delete youth profile
          await client.query(
            `DELETE FROM "Youth_Profiling" WHERE youth_id = $1`,
            [youthId]
          );

          // Update request status
          await client.query(
            `UPDATE "Data_Subject_Requests"
             SET request_status = 'completed',
                 completed_at = CURRENT_TIMESTAMP,
                 response_text = 'Your personal data has been permanently deleted from our systems.',
                 updated_at = CURRENT_TIMESTAMP
             WHERE request_id = $1`,
            [requestId]
          );

          await client.query('COMMIT');

          await this.addRequestLog(requestId, 'Erasure request processed - data deleted', processedBy, {
            deleted: true,
          });

          await this.sendErasureConfirmationEmail(request);

          return {
            success: true,
            message: 'Data deleted successfully',
          };
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        } finally {
          client.release();
        }
      }
    } catch (error) {
      logger.error('Error processing erasure request', { error: error.message, stack: error.stack, requestId });
      throw error;
    }
  }

  /**
   * Process portability request - export user data
   */
  async processPortabilityRequest(requestId, processedBy) {
    try {
      const requestResult = await this.getRequest(requestId);
      if (!requestResult.success) {
        return { success: false, message: 'Request not found' };
      }

      const request = requestResult.request;

      // Try to find youth_id if not provided
      let youthId = request.youth_id;
      if (!youthId && request.email) {
        youthId = await this.findYouthByEmail(request.email);
        if (youthId) {
          await query(
            `UPDATE "Data_Subject_Requests" SET youth_id = $1 WHERE request_id = $2`,
            [youthId, requestId]
          );
        }
      }

      if (!youthId) {
        return { success: false, message: 'Youth profile not found. Please provide your email address used during registration.' };
      }

      // Gather all user data
      const userData = await this.gatherUserData(youthId);

      // Generate export file (JSON format)
      const exportData = {
        exportDate: new Date().toISOString(),
        youthId: youthId,
        personalData: userData.personalData,
        surveyResponses: userData.surveyResponses,
        consentHistory: userData.consentHistory,
      };

      // Update request with export data
      await query(
        `UPDATE "Data_Subject_Requests"
         SET response_data = $1,
             response_text = 'Your personal data has been exported and is ready for download.',
             request_status = 'completed',
             completed_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE request_id = $2`,
        [JSON.stringify(exportData), requestId]
      );

      // Log processing
      await this.addRequestLog(requestId, 'Portability request processed - data exported', processedBy, {
        dataExported: true,
      });

      // Send export data to requester
      await this.sendPortabilityDataEmail(request, exportData);

      return {
        success: true,
        exportData,
      };
    } catch (error) {
      logger.error('Error processing portability request', { error: error.message, stack: error.stack, requestId });
      throw error;
    }
  }

  /**
   * Process objection request - pause data processing
   */
  async processObjectionRequest(requestId, processedBy) {
    try {
      const requestResult = await this.getRequest(requestId);
      if (!requestResult.success) {
        return { success: false, message: 'Request not found' };
      }

      const request = requestResult.request;

      // Try to find youth_id if not provided
      let youthId = request.youth_id;
      if (!youthId && request.email) {
        youthId = await this.findYouthByEmail(request.email);
        if (youthId) {
          await query(
            `UPDATE "Data_Subject_Requests" SET youth_id = $1 WHERE request_id = $2`,
            [youthId, requestId]
          );
        }
      }

      if (!youthId) {
        return { success: false, message: 'Youth profile not found. Please provide your email address used during registration.' };
      }

      // Mark youth profile to pause processing
      await query(
        `UPDATE "Youth_Profiling"
         SET is_active = false,
             updated_at = CURRENT_TIMESTAMP
         WHERE youth_id = $1`,
        [youthId]
      );

      // Update request status
      await query(
        `UPDATE "Data_Subject_Requests"
         SET request_status = 'completed',
             completed_at = CURRENT_TIMESTAMP,
             response_text = 'Your objection to data processing has been recorded. Your data will no longer be processed for new activities.',
             updated_at = CURRENT_TIMESTAMP
         WHERE request_id = $1`,
        [requestId]
      );

      // Log processing
      await this.addRequestLog(requestId, 'Objection request processed - data processing paused', processedBy, {
        processingPaused: true,
      });

      // Send confirmation email
      await this.sendObjectionConfirmationEmail(request);

      return {
        success: true,
        message: 'Data processing paused',
      };
    } catch (error) {
      logger.error('Error processing objection request', { error: error.message, stack: error.stack, requestId });
      throw error;
    }
  }

  /**
   * Process consent withdrawal request
   */
  async processConsentWithdrawalRequest(requestId, processedBy) {
    try {
      const requestResult = await this.getRequest(requestId);
      if (!requestResult.success) {
        return { success: false, message: 'Request not found' };
      }

      const request = requestResult.request;

      // Try to find youth_id if not provided
      let youthId = request.youth_id;
      if (!youthId && request.email) {
        youthId = await this.findYouthByEmail(request.email);
        if (youthId) {
          await query(
            `UPDATE "Data_Subject_Requests" SET youth_id = $1 WHERE request_id = $2`,
            [youthId, requestId]
          );
        }
      }

      if (!youthId) {
        // For consent withdrawal, we can still process by email
        // Update consent logs by email instead
        await query(
          `UPDATE "Consent_Logs"
           SET consent_status = 'withdrawn',
               withdrawal_date = CURRENT_TIMESTAMP,
               updated_at = CURRENT_TIMESTAMP
           WHERE email = $1 AND consent_type = 'data_processing' AND consent_status = 'granted'`,
          [request.email || request.requester_email]
        );

        await query(
          `UPDATE "Data_Subject_Requests"
           SET request_status = 'completed',
               completed_at = CURRENT_TIMESTAMP,
               response_text = 'Your consent has been withdrawn based on your email address. Note: This may affect your ability to use certain services.',
               updated_at = CURRENT_TIMESTAMP
           WHERE request_id = $1`,
          [requestId]
        );

        return {
          success: true,
          message: 'Consent withdrawn successfully (by email)',
        };
      }

      // Withdraw consent by youth_id
      await consentService.withdrawConsent(
        youthId,
        'data_processing',
        request.requested_by_ip,
        request.requested_by_user_agent
      );

      // Update request status
      await query(
        `UPDATE "Data_Subject_Requests"
         SET request_status = 'completed',
             completed_at = CURRENT_TIMESTAMP,
             response_text = 'Your consent has been withdrawn. Note: This may affect your ability to use certain services.',
             updated_at = CURRENT_TIMESTAMP
         WHERE request_id = $1`,
        [requestId]
      );

      // Log processing
      await this.addRequestLog(requestId, 'Consent withdrawal processed', processedBy, {
        consentWithdrawn: true,
      });

      // Send confirmation email
      await this.sendConsentWithdrawalConfirmationEmail(request);

      return {
        success: true,
        message: 'Consent withdrawn successfully',
      };
    } catch (error) {
      logger.error('Error processing consent withdrawal request', { error: error.message, stack: error.stack, requestId });
      throw error;
    }
  }

  /**
   * Gather all user data for access/portability requests
   */
  async gatherUserData(youthId) {
    try {
      const [youthProfile, surveyResponses, consentHistory] = await Promise.all([
        // Get youth profile
        query(
          `SELECT * FROM "Youth_Profiling" WHERE youth_id = $1`,
          [youthId]
        ),
        // Get survey responses
        query(
          `SELECT * FROM "KK_Survey_Responses" WHERE youth_id = $1 ORDER BY created_at DESC`,
          [youthId]
        ),
        // Get consent history
        query(
          `SELECT * FROM "Consent_Logs" WHERE youth_id = $1 ORDER BY consent_date DESC`,
          [youthId]
        ),
      ]);

      return {
        personalData: youthProfile.rows[0] || null,
        surveyResponses: surveyResponses.rows || [],
        consentHistory: consentHistory.rows || [],
      };
    } catch (error) {
      logger.error('Error gathering user data', { error: error.message, stack: error.stack, youthId });
      throw error;
    }
  }


  /**
   * Verify requester identity
   */
  async verifyIdentity(requestId, verificationMethod, verifiedBy) {
    try {
      await query(
        `UPDATE "Data_Subject_Requests"
         SET identity_verified = TRUE,
             verification_method = $1,
             verification_date = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE request_id = $2`,
        [verificationMethod, requestId]
      );

      await this.addRequestLog(requestId, 'Identity verified', verifiedBy, {
        verificationMethod,
      });

      return { success: true };
    } catch (error) {
      logger.error('Error verifying identity', { error: error.message, stack: error.stack, requestId });
      throw error;
    }
  }

  /**
   * Assign request to staff member
   */
  async assignRequest(requestId, assignedTo) {
    try {
      await query(
        `UPDATE "Data_Subject_Requests"
         SET assigned_to = $1,
             request_status = CASE WHEN request_status = 'pending' THEN 'in_progress' ELSE request_status END,
             updated_at = CURRENT_TIMESTAMP
         WHERE request_id = $2`,
        [assignedTo, requestId]
      );

      await this.addRequestLog(requestId, `Request assigned to staff`, assignedTo, {
        assignedTo,
      });

      return { success: true };
    } catch (error) {
      logger.error('Error assigning request', { error: error.message, stack: error.stack, requestId, assigneeId });
      throw error;
    }
  }

  /**
   * Add request log entry
   */
  async addRequestLog(requestId, logEntry, loggedBy, details = {}) {
    try {
      // Use NULL for system-generated logs (foreign key allows NULL)
      // loggedBy should be a valid user_id from Users table, or NULL for system logs
      await query(
        `INSERT INTO "Data_Subject_Request_Logs"
         (request_id, log_entry, logged_by, logged_at, details)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4)`,
        [requestId, logEntry, loggedBy || null, JSON.stringify(details)]
      );
    } catch (error) {
      logger.error('Error adding request log', { error: error.message, stack: error.stack, requestId });
      // Don't throw - logging failure shouldn't break the operation
    }
  }

  /**
   * Generate request reference
   */
  async generateRequestReference(requestType) {
    try {
      const result = await query(
        `SELECT COUNT(*) as count FROM "Data_Subject_Requests"
         WHERE request_type = $1 AND requested_at >= CURRENT_DATE`,
        [requestType]
      );

      const count = parseInt(result.rows[0].count, 10) + 1;
      const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const typeCode = requestType.substring(0, 3).toUpperCase();
      return `DSR-${typeCode}-${date}-${String(count).padStart(4, '0')}`;
    } catch (error) {
      // Fallback if table doesn't exist
      const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const typeCode = requestType.substring(0, 3).toUpperCase();
      const random = Math.floor(Math.random() * 10000);
      return `DSR-${typeCode}-${date}-${String(random).padStart(4, '0')}`;
    }
  }

  /**
   * Get request statistics
   */
  async getRequestStatistics() {
    try {
      const [totalStats, typeStats, statusStats, overdueStats] = await Promise.all([
        // Total requests
        query(`SELECT COUNT(*) as total FROM "Data_Subject_Requests"`),
        // By type
        query(
          `SELECT request_type, COUNT(*) as count
           FROM "Data_Subject_Requests"
           GROUP BY request_type`
        ),
        // By status
        query(
          `SELECT request_status, COUNT(*) as count
           FROM "Data_Subject_Requests"
           GROUP BY request_status`
        ),
        // Overdue requests
        query(
          `SELECT COUNT(*) as count
           FROM "Data_Subject_Requests"
           WHERE request_status IN ('pending', 'in_progress')
             AND due_date < CURRENT_DATE`
        ),
      ]);

      return {
        success: true,
        data: {
          total: parseInt(totalStats.rows[0].total, 10),
          byType: typeStats.rows.reduce((acc, row) => {
            acc[row.request_type] = parseInt(row.count, 10);
            return acc;
          }, {}),
          byStatus: statusStats.rows.reduce((acc, row) => {
            acc[row.request_status] = parseInt(row.count, 10);
            return acc;
          }, {}),
          overdue: parseInt(overdueStats.rows[0].count, 10),
        },
      };
    } catch (error) {
      logger.error('Error getting request statistics', { error: error.message, stack: error.stack });
      throw error;
    }
  }

  /**
   * Email notification methods
   */
  async sendRequestConfirmationEmail(request, accessToken = null) {
    if (!request.requester_email) return;

    try {
      // Get or generate access token if not provided
      if (!accessToken) {
        const tokenResult = await this.regenerateAccessToken(request.request_id);
        accessToken = tokenResult.token;
      }

      const baseUrl = process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:3000';
      const statusUrl = `${baseUrl}/data-subject-rights/status?token=${accessToken}`;

      // Use requestRef from request object if available, otherwise generate or use request_id
      const requestRef = request.requestRef || await this.generateRequestReference(request.request_type).catch(() => {
        // Fallback: use request_id directly (it's already in DSR format)
        return request.request_id;
      });
      const requestTypeLabel = request.request_type.charAt(0).toUpperCase() + request.request_type.slice(1).replace(/_/g, ' ');

      await emailService.sendEmail({
        to: request.requester_email,
        subject: `Data Subject Rights Request Received - ${requestTypeLabel}`,
        html: `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Data Subject Rights Request Received</title>
            <style>
              body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; }
              .email-container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
              .header { background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%); color: white; padding: 30px 20px; text-align: center; }
              .header h1 { margin: 0; font-size: 22px; font-weight: 600; }
              .content { padding: 40px 30px; color: #333; }
              .content p { line-height: 1.6; margin: 0 0 15px; font-size: 15px; }
              .button { display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #24345A 0%, #1e2a47 100%); color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: 600; font-size: 14px; }
              .footer { background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 13px; color: #6c757d; }
            </style>
          </head>
          <body>
            <div class="email-container">
              <div class="header">
                <h1>Data Subject Rights Request</h1>
                <p>Local Youth Development Office</p>
              </div>
              <div class="content">
                <h2>Request Received</h2>
                <p>Dear <strong>${request.requester_name}</strong>,</p>
                <p>We have received your data subject rights request. Your request is being processed and will be handled in accordance with the Data Privacy Act of 2012 (RA 10173).</p>
                
                <!-- Receipt Card -->
                <div class="card-container" style="max-width: 500px; margin: 30px auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08); overflow: hidden; border: 1px solid #e5e7eb;">
                  <div class="header-green" style="background-color: #e6ffe6; padding: 25px 30px; text-align: center; border-bottom: 1px solid #d9f7d9;">
                    <span class="icon" style="display: inline-block; vertical-align: middle; margin-right: 10px;"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round" style="width: 28px; height: 28px; color: #28a745; fill: #28a745;"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M14 3v4a1 1 0 0 0 1 1h4" /><path d="M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z" /><path d="M9 11l2 2l4 -4" /></svg></span>
                    <h2 style="font-size: 22px; color: #28a745; margin: 0; font-weight: 600; display: inline-block; vertical-align: middle;">Request Submitted</h2>
                    <p style="font-size: 14px; color: #5cb85c; margin: 5px 0 0;">Data Subject Rights Request Confirmation</p>
                  </div>
                  <div class="details-section" style="padding: 30px;">
                    <div class="details-row" style="display: flex; justify-content: space-between; margin-bottom: 15px;">
                      <span class="details-label" style="font-size: 14px; color: #555; font-weight: 500; flex-basis: 45%; text-align: left;">Request ID:</span>
                      <span class="details-value" style="font-size: 14px; color: #333; font-weight: 600; flex-basis: 55%; text-align: right; word-break: break-word; font-family: monospace;">${requestRef}</span>
                    </div>
                    <div class="details-row" style="display: flex; justify-content: space-between; margin-bottom: 15px;">
                      <span class="details-label" style="font-size: 14px; color: #555; font-weight: 500; flex-basis: 45%; text-align: left;">Youth ID:</span>
                      <span class="details-value" style="font-size: 14px; color: #333; font-weight: 600; flex-basis: 55%; text-align: right; word-break: break-word; font-family: monospace;">${request.youth_id}</span>
                    </div>
                    <div class="details-row" style="display: flex; justify-content: space-between; margin-bottom: 15px;">
                      <span class="details-label" style="font-size: 14px; color: #555; font-weight: 500; flex-basis: 45%; text-align: left;">Request Type:</span>
                      <span class="details-value" style="font-size: 14px; color: #333; font-weight: 600; flex-basis: 55%; text-align: right; word-break: break-word;">${requestTypeLabel}</span>
                    </div>
                    <div class="details-row" style="display: flex; justify-content: space-between; margin-bottom: 15px;">
                      <span class="details-label" style="font-size: 14px; color: #555; font-weight: 500; flex-basis: 45%; text-align: left;">Requester Name:</span>
                      <span class="details-value" style="font-size: 14px; color: #333; font-weight: 600; flex-basis: 55%; text-align: right; word-break: break-word;">${request.requester_name}</span>
                    </div>
                    <div class="details-row" style="display: flex; justify-content: space-between; margin-bottom: 15px;">
                      <span class="details-label" style="font-size: 14px; color: #555; font-weight: 500; flex-basis: 45%; text-align: left;">Requester Email:</span>
                      <span class="details-value" style="font-size: 14px; color: #333; font-weight: 600; flex-basis: 55%; text-align: right; word-break: break-word;">${request.requester_email}</span>
                    </div>
                    <div class="details-row" style="display: flex; justify-content: space-between; margin-bottom: 15px;">
                      <span class="details-label" style="font-size: 14px; color: #555; font-weight: 500; flex-basis: 45%; text-align: left;">Submitted On:</span>
                      <span class="details-value" style="font-size: 14px; color: #333; font-weight: 600; flex-basis: 55%; text-align: right; word-break: break-word;">${new Date(request.requested_at).toLocaleDateString()}</span>
                    </div>
                    <div class="details-row" style="display: flex; justify-content: space-between; margin-bottom: 15px;">
                      <span class="details-label" style="font-size: 14px; color: #555; font-weight: 500; flex-basis: 45%; text-align: left;">Due Date:</span>
                      <span class="details-value" style="font-size: 14px; color: #333; font-weight: 600; flex-basis: 55%; text-align: right; word-break: break-word;">${new Date(request.due_date).toLocaleDateString()}</span>
                    </div>
                    <div class="button-container" style="text-align: center; margin-top: 25px;">
                      <a href="${statusUrl}" class="button" style="background: linear-gradient(135deg, #24345A 0%, #1e2a47 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: 600; font-size: 14px;">View Request Status</a>
                    </div>
                  </div>
                  <div class="footer-green" style="background-color: #f0fff0; padding: 20px 30px; text-align: center; border-top: 1px solid #e0ffe0;">
                    <span class="icon" style="display: inline-block; vertical-align: middle; margin-right: 8px;"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round" style="width: 18px; height: 18px; color: #28a745; fill: #28a745;"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M5 12l5 5l10 -10" /></svg></span>
                    <p style="font-size: 13px; color: #28a745; margin: 0; display: inline-block; vertical-align: middle; font-weight: 500;">Your request is being processed</p>
                  </div>
                </div>
                
                <p style="margin-top: 30px; font-size: 14px; color: #666;">We will process your request within 30 days as required by the Data Privacy Act of 2012 (RA 10173).</p>
                <p style="font-size: 13px; color: #999; margin-top: 20px;"><strong>Note:</strong> This link will expire in 72 hours. If you need a new link, please contact our Data Protection Officer.</p>
                <p style="font-size: 13px; color: #999;">If you have any questions, please contact our Data Protection Officer.</p>
              </div>
              <div class="footer">
                <p><strong>Local Youth Development Office</strong></p>
                <p>Municipality of San Jose, Batangas</p>
                <p style="margin-top: 15px; font-size: 12px;">© ${new Date().getFullYear()} LYDO. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `,
      });
    } catch (error) {
      logger.error('Failed to send request confirmation email', { error: error.message, stack: error.stack, requestId: request.request_id });
    }
  }

  async sendStatusUpdateEmail(request) {
    if (!request.requester_email) return;

    try {
      // Regenerate access token for status update email
      const tokenResult = await this.regenerateAccessToken(request.request_id);
      const accessToken = tokenResult.token;

      const baseUrl = process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:3000';
      const statusUrl = `${baseUrl}/data-subject-rights/status?token=${accessToken}`;

      // For completed requests with data (access/portability), include data access link
      let dataAccessLink = '';
      if ((request.request_type === 'access' || request.request_type === 'portability') && 
          request.request_status === 'completed' && request.response_data) {
        dataAccessLink = `
          <p><strong>Access your data:</strong></p>
          <p><a href="${statusUrl}" style="background-color: #24345A; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View Your Data</a></p>
        `;
      }

      await emailService.sendEmail({
        to: request.requester_email,
        subject: `Update on Your Data Subject Rights Request - ${request.request_id}`,
        html: `
          <h2>Update on Your Data Subject Rights Request</h2>
          <p>Dear ${request.requester_name},</p>
          <p>Your request (ID: ${request.request_id}) status has been updated to: <strong>${request.request_status}</strong></p>
          ${request.response_text ? `<p>${request.response_text}</p>` : ''}
          ${dataAccessLink}
          <p><strong>Track your request:</strong></p>
          <p><a href="${statusUrl}" style="background-color: #24345A; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View Request Status</a></p>
          <p><small>Or copy this link: ${statusUrl}</small></p>
          <p><small>This link will expire in 72 hours. If you need a new link, please contact our Data Protection Officer.</small></p>
          <p>If you have any questions, please contact our Data Protection Officer.</p>
        `,
      });
    } catch (error) {
      logger.error('Failed to send status update email', { error: error.message, stack: error.stack, requestId: request.request_id });
    }
  }

  async sendAccessDataEmail(request, userData) {
    if (!request.requester_email) return;

    try {
      // Regenerate access token for data access
      const tokenResult = await this.regenerateAccessToken(request.request_id);
      const accessToken = tokenResult.token;

      const baseUrl = process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:3000';
      const dataUrl = `${baseUrl}/data-subject-rights/status?token=${accessToken}`;

      await emailService.sendEmail({
        to: request.requester_email,
        subject: `Your Personal Data - Request ${request.request_id}`,
        html: `
          <h2>Your Personal Data is Ready</h2>
          <p>Dear ${request.requester_name},</p>
          <p>Your request for access to your personal data has been processed.</p>
          <p><strong>Access your data:</strong></p>
          <p><a href="${dataUrl}" style="background-color: #24345A; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View Your Data</a></p>
          <p><small>Or copy this link: ${dataUrl}</small></p>
          <p><small>This link will expire in 72 hours. Please download your data before the link expires.</small></p>
          <p>If you have any questions, please contact our Data Protection Officer.</p>
        `,
      });
    } catch (error) {
      logger.error('Failed to send access data email', { error: error.message, stack: error.stack, requestId: request.request_id });
    }
  }

  async sendRectificationConfirmationEmail(request, corrections) {
    if (!request.requester_email) return;

    try {
      await emailService.sendEmail({
        to: request.requester_email,
        subject: `Data Rectification Completed - Request ${request.request_id}`,
        html: `
          <h2>Data Rectification Completed</h2>
          <p>Dear ${request.requester_name},</p>
          <p>Your personal data has been corrected as requested.</p>
          <p><strong>Corrections made:</strong></p>
          <ul>
            ${Object.entries(corrections).map(([key, value]) => `<li>${key}: ${value}</li>`).join('')}
          </ul>
          <p>If you have any questions, please contact our Data Protection Officer.</p>
        `,
      });
    } catch (error) {
      logger.error('Failed to send rectification confirmation email', { error: error.message, stack: error.stack, requestId: request.request_id });
    }
  }

  async sendErasureConfirmationEmail(request) {
    if (!request.requester_email) return;

    try {
      await emailService.sendEmail({
        to: request.requester_email,
        subject: `Data Deletion Completed - Request ${request.request_id}`,
        html: `
          <h2>Data Deletion Completed</h2>
          <p>Dear ${request.requester_name},</p>
          <p>Your personal data has been permanently deleted from our systems as requested.</p>
          <p>If you have any questions, please contact our Data Protection Officer.</p>
        `,
      });
    } catch (error) {
      logger.error('Failed to send erasure confirmation email', { error: error.message, stack: error.stack, requestId: request.request_id });
    }
  }

  async sendPortabilityDataEmail(request, exportData) {
    if (!request.requester_email) return;

    try {
      // Regenerate access token for data export
      const tokenResult = await this.regenerateAccessToken(request.request_id);
      const accessToken = tokenResult.token;

      const baseUrl = process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:3000';
      const dataUrl = `${baseUrl}/data-subject-rights/status?token=${accessToken}`;

      await emailService.sendEmail({
        to: request.requester_email,
        subject: `Your Data Export - Request ${request.request_id}`,
        html: `
          <h2>Your Data Export is Ready</h2>
          <p>Dear ${request.requester_name},</p>
          <p>Your request for data portability has been processed. Your data is ready for download.</p>
          <p><strong>Download your data:</strong></p>
          <p><a href="${dataUrl}" style="background-color: #24345A; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Download Your Data</a></p>
          <p><small>Or copy this link: ${dataUrl}</small></p>
          <p><small>This link will expire in 72 hours. Please download your data before the link expires.</small></p>
          <p>If you have any questions, please contact our Data Protection Officer.</p>
        `,
      });
    } catch (error) {
      logger.error('Failed to send portability data email', { error: error.message, stack: error.stack, requestId: request.request_id });
    }
  }

  async sendObjectionConfirmationEmail(request) {
    if (!request.requester_email) return;

    try {
      await emailService.sendEmail({
        to: request.requester_email,
        subject: `Data Processing Objection Processed - Request ${request.request_id}`,
        html: `
          <h2>Data Processing Objection Processed</h2>
          <p>Dear ${request.requester_name},</p>
          <p>Your objection to data processing has been recorded. Your data will no longer be processed for new activities.</p>
          <p>If you have any questions, please contact our Data Protection Officer.</p>
        `,
      });
    } catch (error) {
      logger.error('Failed to send objection confirmation email', { error: error.message, stack: error.stack, requestId: request.request_id });
    }
  }

  async sendConsentWithdrawalConfirmationEmail(request) {
    if (!request.requester_email) return;

    try {
      await emailService.sendEmail({
        to: request.requester_email,
        subject: `Consent Withdrawal Processed - Request ${request.request_id}`,
        html: `
          <h2>Consent Withdrawal Processed</h2>
          <p>Dear ${request.requester_name},</p>
          <p>Your consent has been withdrawn. Note: This may affect your ability to use certain services.</p>
          <p>If you have any questions, please contact our Data Protection Officer.</p>
        `,
      });
    } catch (error) {
      logger.error('Failed to send consent withdrawal confirmation email', { error: error.message, stack: error.stack, requestId: request.request_id });
    }
  }

  async notifyDPO(request) {
    const dpoEmail = process.env.DATA_PROTECTION_OFFICER_EMAIL || process.env.EMAIL_USER;
    if (!dpoEmail) return;

    try {
      await emailService.sendEmail({
        to: dpoEmail,
        subject: `New Data Subject Rights Request - ${request.request_type}`,
        html: `
          <h2>New Data Subject Rights Request</h2>
          <p><strong>Request ID:</strong> ${request.request_id}</p>
          <p><strong>Request Type:</strong> ${request.request_type}</p>
          <p><strong>Requester:</strong> ${request.requester_name} (${request.requester_email})</p>
          <p><strong>Request Date:</strong> ${new Date(request.requested_at).toLocaleDateString()}</p>
          <p><strong>Due Date:</strong> ${new Date(request.due_date).toLocaleDateString()}</p>
          <p><strong>Description:</strong> ${request.request_description}</p>
          <p>Please review and process this request within 30 days.</p>
        `,
      });
    } catch (error) {
      logger.error('Failed to notify DPO', { error: error.message, stack: error.stack, requestId: request.request_id });
    }
  }
}

// Create singleton instance
const dataSubjectRightsService = new DataSubjectRightsService();

export default dataSubjectRightsService;

