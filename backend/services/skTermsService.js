import { getClient } from '../config/database.js';
import { generateTermId } from '../utils/idGenerator.js';
import { sanitizeInput } from '../utils/validation.js';
import logger from '../utils/logger.js';
import {
  validateTermCreation,
  validateTermActivation,
  validateTermCompletion
} from '../utils/skValidation.js';

class SKTermsService {
  
  // =============================================================================
  // BUSINESS CONSTANTS
  // =============================================================================
  
  static VALID_STATUSES = ['active', 'completed', 'upcoming'];
  static VALID_SORT_FIELDS = ['start_date', 'end_date', 'term_name', 'status', 'created_at'];
  static VALID_SORT_ORDERS = ['asc', 'desc'];
  static DEFAULT_PAGE_SIZE = 10;
  static MAX_PAGE_SIZE = 100;

  // =============================================================================
  // VALIDATION METHODS
  // =============================================================================

  /**
   * Check if there's already an active term
   * @param {string} excludeTermId - Optional term ID to exclude from check
   * @returns {Promise<{hasActive: boolean, activeTerm: Object|null}>}
   */
  static async checkActiveTerm(excludeTermId = null) {
    const client = await getClient();
    try {
      let query = `
        SELECT term_id, term_name, start_date, end_date, status
        FROM "SK_Terms"
        WHERE status = 'active'
      `;
      const params = [];
      if (excludeTermId) {
        query += ' AND term_id != $1';
        params.push(excludeTermId);
      }
      const result = await client.query(query, params);
      return {
        hasActive: result.rows.length > 0,
        activeTerm: result.rows[0] || null
      };
    } catch (error) {
      logger.error('Error checking active term:', error);
      throw new Error('Failed to check active term status');
    } finally {
      client.release();
    }
  }

  /**
   * Check for date conflicts with existing terms
   * @param {string} startDate - Start date (YYYY-MM-DD)
   * @param {string} endDate - End date (YYYY-MM-DD)
   * @param {string} excludeTermId - Optional term ID to exclude
   * @returns {Promise<{hasConflicts: boolean, conflicts: Array}>}
   */
  static async checkDateConflicts(startDate, endDate, excludeTermId = null) {
    const client = await getClient();
    try {
      let query = `
        SELECT term_id, term_name, start_date, end_date, status
        FROM "SK_Terms"
        WHERE (
          (start_date <= $1 AND end_date >= $1) OR
          (start_date <= $2 AND end_date >= $2) OR
          (start_date >= $1 AND end_date <= $2) OR
          (start_date <= $1 AND end_date >= $2)
        )
        AND status != 'completed'
      `;
      const params = [startDate, endDate];
      
      if (excludeTermId) {
        query += ' AND term_id != $3';
        params.push(excludeTermId);
      }
      
      const result = await client.query(query, params);
      return {
        hasConflicts: result.rows.length > 0,
        conflicts: result.rows
      };
    } catch (error) {
      logger.error('Error checking date conflicts:', error);
      throw new Error('Failed to check date conflicts');
    } finally {
      client.release();
    }
  }

  /**
   * Check for duplicate term names
   * @param {string} termName - Term name to check
   * @param {string} currentTermId - Current term ID (for updates)
   * @returns {Promise<{hasDuplicate: boolean, duplicateTerm: Object|null}>}
   */
  static async checkDuplicateTermName(termName, currentTermId = null) {
    const client = await getClient();
    
    try {
      let query = `
        SELECT term_id, term_name, status, created_at
        FROM "SK_Terms"
        WHERE LOWER(term_name) = LOWER($1)
      `;
      
      const params = [termName.trim()];
      
      // For updates, exclude the current term
      if (currentTermId) {
        query += ' AND term_id != $2';
        params.push(currentTermId);
      }
      
      const result = await client.query(query, params);
      
      return {
        hasDuplicate: result.rows.length > 0,
        duplicateTerm: result.rows[0] || null
      };
    } catch (error) {
      logger.error('Error checking duplicate term name:', error);
      throw new Error('Failed to check for duplicate term names');
    } finally {
      client.release();
    }
  }

  /**
   * Get suggested term dates that don't conflict with existing terms
   * @returns {Promise<Array>} Array of suggested date ranges
   */
  static async getSuggestedDates() {
    const client = await getClient();
    try {
      // Get all existing terms
      const existingTerms = await client.query(`
        SELECT start_date, end_date
        FROM "SK_Terms"
        WHERE status != 'completed'
        ORDER BY start_date DESC
      `);
      
      const suggestions = [];
      const today = new Date();
      const twoYearsLater = new Date(today.getFullYear() + 2, today.getMonth(), today.getDate());
      
      // Suggest dates starting from today
      suggestions.push({
        startDate: today.toISOString().split('T')[0],
        endDate: twoYearsLater.toISOString().split('T')[0],
        description: 'Starting from today for 2 years'
      });
      
      // If there are existing terms, suggest dates after the latest one
      if (existingTerms.rows.length > 0) {
        const latestTerm = existingTerms.rows[0];
        const afterLatestStart = new Date(latestTerm.end_date);
        afterLatestStart.setDate(afterLatestStart.getDate() + 1);
        const afterLatestEnd = new Date(afterLatestStart);
        afterLatestEnd.setFullYear(afterLatestEnd.getFullYear() + 2);
        
        suggestions.push({
          startDate: afterLatestStart.toISOString().split('T')[0],
          endDate: afterLatestEnd.toISOString().split('T')[0],
          description: 'Starting after the latest term ends'
        });
      }
      
      // Return formatted strings
      return suggestions.map(s => 
        `${s.startDate} to ${s.endDate} (${s.description})`
      );
    } catch (error) {
      logger.error('Error getting suggested dates:', error);
      return [];
    } finally {
      client.release();
    }
  }

  // =============================================================================
  // CRUD OPERATIONS
  // =============================================================================

  /**
   * Create a new SK term
   * @param {Object} termData - Term data
   * @returns {Promise<Object>} Created term
   */
  static async createTerm(termData) {
    const client = await getClient();
    
    try {
      await client.query('BEGIN');

      // Validate the term data
      const validation = await validateTermCreation(termData, false, client);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      const {
        termName,
        startDate,
        endDate,
        autoActivate = false,
        createdBy
      } = termData;

      // Generate term ID
      const termId = await generateTermId();

      // Check if term ID already exists
      const idExists = await client.query(
        'SELECT COUNT(*) AS count FROM "SK_Terms" WHERE term_id = $1',
        [termId]
      );
      if (parseInt(idExists.rows[0].count) > 0) {
        throw new Error('Generated term ID already exists. Please retry.');
      }

      // Determine status
      let status = 'upcoming';
      const currentDate = new Date();
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (autoActivate && start <= currentDate && end >= currentDate) {
        // Check if there's already an active term
        const activeCheck = await this.checkActiveTerm();
        if (activeCheck.hasActive) {
          throw new Error('Cannot auto-activate term. Another term is already active.');
        }
        status = 'active';
      }

      // Insert SK Term
      const insertQuery = `
        INSERT INTO "SK_Terms" (
          term_id, term_name, start_date, end_date, status, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;

      const insertValues = [
        termId,
        termName.trim(),
        startDate,
        endDate,
        status,
        createdBy
      ];

      const result = await client.query(insertQuery, insertValues);
      await client.query('COMMIT');

      logger.info(`SK term created: ${termId} by ${createdBy}`);
      return result.rows[0];

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error creating SK term:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get term by ID
   * @param {string} termId - Term ID
   * @returns {Promise<Object|null>} Term object or null
   */
  static async getTermById(termId) {
    const client = await getClient();
    
    try {
      const result = await client.query(
        'SELECT * FROM "SK_Terms" WHERE term_id = $1',
        [termId]
      );
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error getting term by ID:', error);
      throw new Error('Failed to get term');
    } finally {
      client.release();
    }
  }

  /**
   * Update an SK term
   * @param {string} termId - Term ID
   * @param {Object} updateData - Update data (partial update)
   * @returns {Promise<Object>} Updated term
   */
  static async updateTerm(termId, updateData) {
    const client = await getClient();
    
    try {
      await client.query('BEGIN');

      // Get current term
      const currentTerm = await this.getTermById(termId);
      if (!currentTerm) {
        throw new Error('SK Term not found');
      }

      // Normalize dates to YYYY-MM-DD format for comparison
      const normalizeDate = (date) => {
        if (!date) return null;
        if (date instanceof Date) {
          return date.toISOString().split('T')[0];
        }
        // Handle string dates (multiple formats)
        if (typeof date === 'string') {
          // If already in YYYY-MM-DD format, return as is
          if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return date;
          }
          // Otherwise parse it
          const d = new Date(date);
          if (isNaN(d.getTime())) return null;
          return d.toISOString().split('T')[0];
        }
        return null;
      };
      
      const existingStartStr = normalizeDate(currentTerm.start_date);
      const existingEndStr = normalizeDate(currentTerm.end_date);
      
      // Check if dates have actually changed by comparing normalized date strings
      // Only validate date conflicts if dates have actually changed
      // This is critical: if user only updates name, we should skip date overlap validation
      let datesChanged = false;
      
      // Only check for changes if dates are provided in updateData
      if (updateData.startDate !== undefined && updateData.startDate !== null) {
        const newStartStr = normalizeDate(updateData.startDate);
        if (newStartStr && newStartStr !== existingStartStr) {
          datesChanged = true;
          logger.info(`🔍 Start date changed: ${existingStartStr} → ${newStartStr}`);
        }
      }
      
      if (updateData.endDate !== undefined && updateData.endDate !== null) {
        const newEndStr = normalizeDate(updateData.endDate);
        if (newEndStr && newEndStr !== existingEndStr) {
          datesChanged = true;
          logger.info(`🔍 End date changed: ${existingEndStr} → ${newEndStr}`);
        }
      }
      
      logger.info('🔍 Date change detection:', {
        updateDataKeys: Object.keys(updateData),
        existingStart: existingStartStr,
        existingEnd: existingEndStr,
        providedStart: updateData.startDate ? normalizeDate(updateData.startDate) : 'not provided',
        providedEnd: updateData.endDate ? normalizeDate(updateData.endDate) : 'not provided',
        datesChanged,
        skipOverlapCheck: !datesChanged
      });

      // Merge current term data with update data for validation (Survey Batch pattern)
      // This ensures validation works with complete data, but only validates what's changing
      const mergedData = {
        termName: updateData.termName !== undefined ? updateData.termName : currentTerm.term_name,
        startDate: updateData.startDate !== undefined ? updateData.startDate : currentTerm.start_date,
        endDate: updateData.endDate !== undefined ? updateData.endDate : currentTerm.end_date,
        termId: termId
      };

      // Validate the update data
      const validation = await validateTermCreation(mergedData, true, client, datesChanged);
      
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      // Build update query dynamically - only update fields that are provided
      const updateFields = [];
      const values = [];
      let paramCount = 0;

      const allowedFields = ['termName', 'startDate', 'endDate'];
      const fieldMapping = {
        termName: 'term_name',
        startDate: 'start_date',
        endDate: 'end_date'
      };

      allowedFields.forEach(field => {
        if (updateData.hasOwnProperty(field)) {
          updateFields.push(`${fieldMapping[field]} = $${++paramCount}`);
          values.push(updateData[field]);
        }
      });

      if (updateFields.length === 0) {
        throw new Error('No valid fields to update');
      }

      // Always update updated_at
      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(termId);

      const query = `
        UPDATE "SK_Terms"
        SET ${updateFields.join(', ')}
        WHERE term_id = $${++paramCount}
        RETURNING *
      `;

      const result = await client.query(query, values);
      await client.query('COMMIT');

      logger.info(`SK term updated: ${termId}`);
      return result.rows[0];

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error updating SK term:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Delete an SK term (soft delete)
   * @param {string} termId - Term ID
   * @returns {Promise<boolean>} Success status
   */
  static async deleteTerm(termId) {
    const client = await getClient();
    
    try {
      await client.query('BEGIN');

      // Check if term exists
      const term = await this.getTermById(termId);
      if (!term) {
        throw new Error('SK Term not found');
      }

      // Check if term has officials
      const officialsCheck = await client.query(
        'SELECT COUNT(*) as count FROM "SK_Officials" WHERE term_id = $1',
        [termId]
      );

      const officialsCount = parseInt(officialsCheck.rows[0].count);
      if (officialsCount > 0) {
        throw new Error(`Cannot delete term. ${officialsCount} SK officials are assigned to this term.`);
      }

      // Soft delete by disabling the term
      const deleteQuery = `
        UPDATE "SK_Terms"
        SET is_active = false, updated_at = CURRENT_TIMESTAMP
        WHERE term_id = $1
        RETURNING *
      `;

      const result = await client.query(deleteQuery, [termId]);
      await client.query('COMMIT');

      logger.info(`SK term deleted (soft): ${termId}`);
      return result.rowCount > 0;

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error deleting SK term:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // =============================================================================
  // STATUS MANAGEMENT
  // =============================================================================

  /**
   * Update SK term status (like Survey Batch's updateBatchStatus)
   * @param {string} termId - Term ID
   * @param {string} newStatus - New status ('active', 'completed')
   * @param {string} userId - User performing the action
   * @param {Object} options - Additional options (isForce, reason, etc.)
   * @returns {Promise<Object>} Updated term
   */
  static async updateTermStatus(termId, newStatus, userId, options = {}) {
    const client = await getClient();
    
    try {
      await client.query('BEGIN');

      // Get current term
      const currentTerm = await this.getTermById(termId);
      if (!currentTerm) {
        throw new Error('SK Term not found');
      }

      // Validate status
      if (!this.VALID_STATUSES.includes(newStatus)) {
        throw new Error(`Invalid status. Valid statuses: ${this.VALID_STATUSES.join(', ')}`);
      }

      // Prepare update query based on status change and action
      let query, values;

      // Force-activate: set status active and align start_date to today if it is in the future
      if (newStatus === 'active' && options.isForce) {
        query = `
          UPDATE "SK_Terms"
          SET status = $1,
              start_date = CASE WHEN start_date > CURRENT_DATE THEN CURRENT_DATE ELSE start_date END,
              updated_at = CURRENT_TIMESTAMP
          WHERE term_id = $2
          RETURNING *
        `;
        values = [newStatus, termId];
      } else if (newStatus === 'completed') {
        // Completing: update end_date to today for active terms (like closing a batch)
        // Also set is_current = false to prevent it from being selected as active
        const today = new Date().toISOString().split('T')[0];
        query = `
          UPDATE "SK_Terms"
          SET status = $1,
              is_current = false,
              end_date = CASE WHEN status = 'active' THEN $2 ELSE end_date END,
              completion_type = $3,
              completed_at = CURRENT_TIMESTAMP,
              completed_by = $4,
              last_status_change_at = CURRENT_TIMESTAMP,
              last_status_change_by = $4,
              status_change_reason = $5,
              updated_at = CURRENT_TIMESTAMP
          WHERE term_id = $6
          RETURNING *
        `;
        const completionType = currentTerm.status === 'active' ? 'manual' : (options.isForce ? 'forced' : 'manual');
        const statusChangeReason = options.isForce
          ? 'Forced completion by admin before end date'
          : currentTerm.status === 'active'
          ? 'Term completed by admin (end date adjusted to today)'
          : 'Manual completion by admin';
        values = [newStatus, today, completionType, userId, statusChangeReason, termId];
      } else {
        // Regular status update (normal activate)
        query = `
          UPDATE "SK_Terms" 
          SET status = $1, updated_at = CURRENT_TIMESTAMP
          WHERE term_id = $2
          RETURNING *
        `;
        values = [newStatus, termId];
      }

      // Validate before updating (skip for force actions)
      if (newStatus === 'active') {
        if (options.isForce) {
          // For force activate, only check if there's already an active term
          const activeCheck = await this.checkActiveTerm(termId);
          if (activeCheck.hasActive) {
            throw new Error(`Only one active SK term is allowed at a time. Currently active: ${activeCheck.activeTerm.term_name}`);
          }
        } else {
          // Normal activate: validate as usual
          const validationErrors = await validateTermActivation(termId, client);
          if (validationErrors.length > 0) {
            throw new Error(validationErrors.join(', '));
          }
        }
      }

      const result = await client.query(query, values);
      
      if (result.rows.length === 0) {
        throw new Error('Term not found or could not be updated');
      }

      await client.query('COMMIT');

      logger.info(`SK term status updated: ${termId} from ${currentTerm.status} to ${newStatus} by ${userId}`);
      return result.rows[0];

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error updating term status:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Activate an SK term
   * @param {string} termId - Term ID
   * @param {boolean} force - Whether to force activate (adjust start date to today if future)
   * @returns {Promise<Object>} Activated term
   */
  static async activateTerm(termId, force = false) {
    const client = await getClient();
    
    try {
      await client.query('BEGIN');

      // Get current term to check dates
      const term = await this.getTermById(termId);
      if (!term) {
        throw new Error('SK Term not found');
      }

      // Validate term activation (skip date validation for force activate)
      if (!force) {
        const validationErrors = await validateTermActivation(termId, client);
        if (validationErrors.length > 0) {
          throw new Error(validationErrors.join(', '));
        }
      } else {
        // For force activate, only check if there's already an active term
        const activeCheck = await this.checkActiveTerm(termId);
        if (activeCheck.hasActive) {
          throw new Error(`Only one active SK term is allowed at a time. Currently active: ${activeCheck.activeTerm.term_name}`);
        }
      }

      // Activate the term
      // Force-activate: set status active and align start_date to today if it is in the future
      let updateQuery;
      if (force) {
        updateQuery = `
          UPDATE "SK_Terms"
          SET status = 'active',
              start_date = CASE WHEN start_date > CURRENT_DATE THEN CURRENT_DATE ELSE start_date END,
              updated_at = CURRENT_TIMESTAMP
          WHERE term_id = $1
          RETURNING *
        `;
      } else {
        updateQuery = `
          UPDATE "SK_Terms"
          SET status = 'active', updated_at = CURRENT_TIMESTAMP
          WHERE term_id = $1
          RETURNING *
        `;
      }

      const result = await client.query(updateQuery, [termId]);
      
      if (result.rows.length === 0) {
        throw new Error('Term not found or could not be updated');
      }

      await client.query('COMMIT');

      logger.info(`SK term ${force ? 'force ' : ''}activated: ${termId}`);
      return result.rows[0];

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error activating SK term:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Complete an SK term
   * @param {string} termId - Term ID
   * @param {boolean} force - Whether to force completion
   * @param {string} userId - User performing the action
   * @returns {Promise<Object>} Completed term and affected officials
   */
  static async completeTerm(termId, force = false, userId = null) {
    const client = await getClient();
    
    try {
      await client.query('BEGIN');

      // Get current term details
      const term = await this.getTermById(termId);
      if (!term) {
        throw new Error('SK Term not found');
      }

      const today = new Date().toISOString().split('T')[0];

      // Determine completion type and validation
      let completionType = 'manual';
      let endDate = term.end_date;
      let validationErrors = [];

      // For active terms, always set end_date to today (like closing a batch)
      // This ensures consistency with Survey Batch behavior
      if (term.status === 'active') {
        // Set end_date to today when completing an active term
        endDate = today;
        completionType = 'manual'; // Still manual completion, just with adjusted date
      } else if (force) {
        // Force completion: update end date to today and skip some validations
        completionType = 'forced';
        endDate = today;
      } else {
        // Normal completion for non-active terms: validate as usual
        validationErrors = await validateTermCompletion(termId, client);
        if (validationErrors.length > 0) {
          throw new Error(validationErrors.join(', '));
        }
      }

      const statusChangeReason = force
        ? 'Forced completion by admin before end date'
        : term.status === 'active'
        ? 'Term completed by admin (end date adjusted to today)'
        : 'Manual completion by admin';

      // Mark the term as completed
      const updateQuery = `
        UPDATE "SK_Terms"
        SET
          status = 'completed',
          completion_type = $1,
          completed_at = CURRENT_TIMESTAMP,
          completed_by = $2,
          end_date = $3,
          last_status_change_at = CURRENT_TIMESTAMP,
          last_status_change_by = $2,
          status_change_reason = $4,
          updated_at = CURRENT_TIMESTAMP
        WHERE term_id = $5
        RETURNING *
      `;

      const result = await client.query(updateQuery, [
        completionType,
        userId,
        endDate,
        statusChangeReason,
        termId
      ]);

      // Update account access for officials in the completed term
      const accountUpdateQuery = `
        UPDATE "SK_Officials"
        SET
          account_access = false,
          account_access_updated_at = CURRENT_TIMESTAMP,
          account_access_updated_by = $1
        WHERE
          term_id = $2
          AND account_access = true
        RETURNING sk_id, first_name, last_name, email
      `;

      const accountResult = await client.query(accountUpdateQuery, [userId, termId]);

      await client.query('COMMIT');

      logger.info(`SK term completed: ${termId} (${completionType})`);
      
      return {
        term: result.rows[0],
        officialsAffected: accountResult.rows
      };

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error completing SK term:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // =============================================================================
  // STATISTICS AND UTILITIES
  // =============================================================================

  /**
   * Handle errors with consistent error format
   * @param {Error} error - Error object
   * @param {string} defaultMessage - Default error message
   * @returns {Object} Formatted error response
   */
  static handleError(error, defaultMessage) {
    logger.error('SKTermsService Error:', error);

    // Handle database errors
    if (error.code === '23505') { // Unique violation
      return {
        success: false,
        error: 'A term with this name already exists.',
        code: 'DUPLICATE_NAME'
      };
    }

    if (error.code === '23503') { // Foreign key violation
      return {
        success: false,
        error: 'Cannot perform this action due to existing references.',
        code: 'FOREIGN_KEY_VIOLATION'
      };
    }

    if (error.code === '23514') { // Check violation
      return {
        success: false,
        error: 'Data validation failed.',
        code: 'VALIDATION_ERROR'
      };
    }

    // Handle custom business rule errors
    if (error.message.includes('Validation failed')) {
      return {
        success: false,
        error: error.message,
        code: 'VALIDATION_ERROR'
      };
    }

    if (error.message.includes('already active')) {
      return {
        success: false,
        error: error.message,
        code: 'BUSINESS_RULE_VIOLATION'
      };
    }

    if (error.message.includes('Date conflicts') || error.message.includes('conflicts with existing')) {
      return {
        success: false,
        error: error.message,
        code: 'DATE_CONFLICT'
      };
    }

    // Generic error handling
    return {
      success: false,
      error: error.message || defaultMessage,
      code: 'GENERIC_ERROR'
    };
  }
}

export default SKTermsService;
