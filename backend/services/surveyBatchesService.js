import { getClient } from '../config/database.js';
import logger from '../utils/logger.js';

class SurveyBatchesService {
  
  // =============================================================================
  // BUSINESS CONSTANTS
  // =============================================================================
  
  static VALID_STATUSES = ['active', 'closed', 'draft'];
  static VALID_SORT_FIELDS = ['created_at', 'updated_at', 'start_date', 'end_date', 'batch_name', 'status'];
  static VALID_SORT_ORDERS = ['asc', 'desc'];
  static DEFAULT_PAGE_SIZE = 10;
  static MAX_PAGE_SIZE = 100;

  // =============================================================================
  // VALIDATION METHODS
  // =============================================================================

  /**
   * Check if there's already an active KK survey (business rule enforcement)
   * @param {string} excludeBatchId - Optional batch ID to exclude from check
   * @returns {Promise<{hasActiveKK: boolean, activeBatches: Array}>}
   */
  static async checkActiveKKSurvey(excludeBatchId = null) {
    const client = await getClient();
    try {
      const result = await client.query('SELECT * FROM check_active_kk_survey($1)', [excludeBatchId]);
      
      return {
        hasActiveKK: result.rows.length > 0,
        activeBatches: result.rows
      };
    } catch (error) {
      logger.error('Error checking active KK survey:', error);
      throw new Error('Failed to check active KK survey status');
    } finally {
      client.release();
    }
  }

  /**
   * Check if any survey batch is currently active (global exclusivity)
   * @param {string} excludeBatchId - Optional batch ID to exclude from check
   * @returns {Promise<{hasActive: boolean, activeBatches: Array}>}
   */
  static async checkAnyActiveBatch(excludeBatchId = null) {
    const client = await getClient();
    try {
      let query = `
        SELECT batch_id, batch_name, status
        FROM "KK_Survey_Batches"
        WHERE status = 'active'
      `;
      const params = [];
      if (excludeBatchId) {
        query += ' AND batch_id != $1';
        params.push(excludeBatchId);
      }
      const result = await client.query(query, params);
      return {
        hasActive: result.rows.length > 0,
        activeBatches: result.rows
      };
    } catch (error) {
      logger.error('Error checking any active survey batch:', error);
      throw new Error('Failed to check active survey batches');
    } finally {
      client.release();
    }
  }

  /**
   * Check for date conflicts with existing batches
   * @param {string} startDate - Start date (YYYY-MM-DD)
   * @param {string} endDate - End date (YYYY-MM-DD)
   * @param {string} excludeBatchId - Optional batch ID to exclude
   * @returns {Promise<{hasConflicts: boolean, conflicts: Array}>}
   */
  static async checkDateConflicts(startDate, endDate, excludeBatchId = null) {
    const client = await getClient();
    try {
      const result = await client.query(
        'SELECT * FROM check_batch_date_conflicts($1, $2, $3)', 
        [startDate, endDate, excludeBatchId]
      );
      
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
   * Get batches that need automatic status updates
   * @returns {Promise<Array>} Batches needing status updates
   */
  static async getBatchesNeedingStatusUpdate() {
    const client = await getClient();
    try {
      const result = await client.query('SELECT * FROM get_batches_needing_status_update()');
      return result.rows;
    } catch (error) {
      logger.error('Error getting batches needing status update:', error);
      throw new Error('Failed to get batches needing status update');
    } finally {
      client.release();
    }
  }

  /**
   * Validate batch data for creation/update
   * @param {Object} batchData - Batch data to validate
   * @param {boolean} isUpdate - Whether this is an update operation
   * @param {string} currentBatchId - Current batch ID for updates
   * @returns {Promise<{isValid: boolean, errors: Array}>}
   */
  static async validateBatchData(batchData, isUpdate = false, currentBatchId = null) {
    const errors = [];

    try {
      // Required field validation
      if (!batchData.batch_name?.trim()) {
        errors.push('Batch name is required');
      } else {
        // Check for duplicate batch names
        const duplicateCheck = await this.checkDuplicateBatchName(
          batchData.batch_name.trim(), 
          currentBatchId
        );
        
        if (duplicateCheck.hasDuplicate) {
          errors.push(`A survey batch with the name "${batchData.batch_name.trim()}" already exists`);
        }
      }

      if (!batchData.start_date) {
        errors.push('Start date is required');
      }

      if (!batchData.end_date) {
        errors.push('End date is required');
      }

      if (!batchData.created_by?.trim()) {
        errors.push('Creator ID is required');
      }

      // Date validation
      if (batchData.start_date && batchData.end_date) {
        const startDate = new Date(batchData.start_date);
        const endDate = new Date(batchData.end_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (startDate >= endDate) {
          errors.push('End date must be after start date');
        }

        // Check for date conflicts
        const conflicts = await this.checkDateConflicts(
          batchData.start_date, 
          batchData.end_date, 
          currentBatchId
        );
        
        if (conflicts.hasConflicts) {
          const conflictNames = conflicts.conflicts.map(c => c.batch_name).join(', ');
          errors.push(`Date conflicts with existing surveys: ${conflictNames}`);
        }
      }

      // Age range validation
      if (batchData.target_age_min && batchData.target_age_max) {
        if (batchData.target_age_min >= batchData.target_age_max) {
          errors.push('Maximum age must be greater than minimum age');
        }
        if (batchData.target_age_min < 15 || batchData.target_age_max > 30) {
          errors.push('Age range must be between 15 and 30 years');
        }
      }

      // KK Survey active validation (only one active KK survey allowed)
      if (this.isKKSurveyName(batchData.batch_name)) {
        const activeKK = await this.checkActiveKKSurvey(currentBatchId);
        if (activeKK.hasActiveKK) {
          const activeNames = activeKK.activeBatches.map(b => b.batch_name).join(', ');
          errors.push(`Only one active Katipunan ng Kabataan survey is allowed at a time. Currently active: ${activeNames}`);
        }
      }

      return {
        isValid: errors.length === 0,
        errors
      };

    } catch (error) {
      logger.error('Error validating batch data:', error);
      throw new Error('Failed to validate batch data');
    }
  }

  /**
   * Check if a survey name is a KK survey type
   * @param {string} name - Survey name
   * @returns {boolean}
   */
  static isKKSurveyName(name) {
    if (!name) return false;
    const lowerName = name.toLowerCase();
    return lowerName.includes('katipunan ng kabataan') || 
           lowerName.includes('kk survey') ||
           lowerName.includes('kk ');
  }

  /**
   * Check for duplicate batch names
   * @param {string} batchName - Batch name to check
   * @param {string} currentBatchId - Current batch ID (for updates)
   * @returns {Promise<{hasDuplicate: boolean, duplicateBatch: Object|null}>}
   */
  static async checkDuplicateBatchName(batchName, currentBatchId = null) {
    const client = await getClient();
    
    try {
      let query = `
        SELECT batch_id, batch_name, status, created_at 
        FROM "KK_Survey_Batches" 
        WHERE LOWER(batch_name) = LOWER($1)
      `;
      
      const params = [batchName];
      
      // For updates, exclude the current batch
      if (currentBatchId) {
        query += ` AND batch_id != $2`;
        params.push(currentBatchId);
      }
      
      const result = await client.query(query, params);
      
      return {
        hasDuplicate: result.rows.length > 0,
        duplicateBatch: result.rows[0] || null
      };
      
    } catch (error) {
      logger.error('Error checking duplicate batch name:', error);
      throw new Error('Failed to check for duplicate batch names');
    } finally {
      client.release();
    }
  }

  // =============================================================================
  // CRUD OPERATIONS
  // =============================================================================

  /**
   * Create a new survey batch
   * @param {Object} batchData - Batch data
   * @returns {Promise<Object>} Created batch
   */
  static async createBatch(batchData) {
    const client = await getClient();
    
    try {
      await client.query('BEGIN');

      // Validate the batch data
      const validation = await this.validateBatchData(batchData);
      if (!validation.isValid) {
        const errorMessage = `Validation failed: ${validation.errors.join(', ')}`;
        logger.error('Validation failed with errors:', validation.errors);
        logger.error('Throwing error message:', errorMessage);
        throw new Error(errorMessage);
      }

      // Generate batch ID
      const batchId = await this.generateBatchId();

      // Insert the batch
      const query = `
        INSERT INTO "KK_Survey_Batches" (
          batch_id, batch_name, description, start_date, end_date, 
          target_age_min, target_age_max, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;

      const values = [
        batchId,
        batchData.batch_name.trim(),
        batchData.description?.trim() || null,
        batchData.start_date,
        batchData.end_date,
        batchData.target_age_min || 15,
        batchData.target_age_max || 30,
        batchData.created_by
      ];

      const result = await client.query(query, values);
      await client.query('COMMIT');

      logger.info(`Survey batch created: ${batchId} by ${batchData.created_by}`);
      return result.rows[0];

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error creating survey batch:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get all survey batches with optional filtering and pagination
   * @param {Object} options - Query options
   * @returns {Promise<{data: Array, total: number, page: number, pageSize: number}>}
   */
  static async getAllBatches(options = {}) {
    const client = await getClient();
    
    try {
      console.log('🔍 Backend Service - getAllBatches called with options:', options);
      
      const {
        page = 1,
        pageSize = this.DEFAULT_PAGE_SIZE,
        status,
        search,
        sortBy = 'created_at',
        sortOrder = 'desc',
        includeStats = false,
        dateCreated
      } = options;
      
      // Convert includeStats to boolean if it's a string
      const processedIncludeStats = includeStats === 'true' || includeStats === true;
      
      // Debug: Check the includeStats parameter
      console.log('🔍 Backend Service - includeStats parameter:', {
        raw: options.includeStats,
        type: typeof options.includeStats,
        processed: includeStats,
        processedType: typeof includeStats,
        finalProcessed: processedIncludeStats,
        finalType: typeof processedIncludeStats
      });

      // Validate and sanitize inputs
      const validatedPageSize = Math.min(Math.max(1, parseInt(pageSize)), this.MAX_PAGE_SIZE);
      const validatedPage = Math.max(1, parseInt(page));
      const validatedSortBy = this.VALID_SORT_FIELDS.includes(sortBy) ? sortBy : 'created_at';
      const validatedSortOrder = this.VALID_SORT_ORDERS.includes(sortOrder?.toLowerCase()) ? sortOrder.toLowerCase() : 'desc';

      // Build WHERE clause
      let whereConditions = [];
      let queryParams = [];
      let paramCount = 0;

      if (status && this.VALID_STATUSES.includes(status)) {
        whereConditions.push(`status = $${++paramCount}`);
        queryParams.push(status);
      }

      if (search?.trim()) {
        whereConditions.push(`batch_name ILIKE $${++paramCount}`);
        queryParams.push(`%${search.trim()}%`);
      }

      if (dateCreated) {
        whereConditions.push(`created_at >= $${++paramCount}`);
        queryParams.push(dateCreated);
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      console.log('🔍 Backend Service - WHERE conditions:', whereConditions);
      console.log('🔍 Backend Service - WHERE clause:', whereClause);
      console.log('🔍 Backend Service - Query params:', queryParams);

      // Build main query
      let dataQuery;
      
      if (processedIncludeStats) {
        // For statistics, we need to handle all statuses
        dataQuery = `
          SELECT 
            kb.*,
            stats.total_responses,
            stats.validated_responses,
            stats.rejected_responses,
            stats.pending_responses,
            stats.total_youths,
            stats.total_youths_surveyed,
            stats.total_youths_not_surveyed,
            stats.response_rate,
            stats.validation_rate,
            -- Calculate days remaining for active batches
            CASE 
              WHEN kb.status = 'active' THEN (kb.end_date - CURRENT_DATE)
              ELSE NULL
            END as days_remaining,
            -- Check if overdue for active batches
            CASE 
              WHEN kb.status = 'active' AND CURRENT_DATE > kb.end_date THEN true
              ELSE false
            END as is_overdue
          FROM "KK_Survey_Batches" kb
          LEFT JOIN LATERAL calculate_batch_statistics(kb.batch_id) stats ON true
          ${whereClause}
          ORDER BY ${validatedSortBy} ${validatedSortOrder.toUpperCase()}
          LIMIT $${++paramCount} OFFSET $${++paramCount}
        `;
      } else {
        // Basic query without statistics
        dataQuery = `
          SELECT * 
          FROM "KK_Survey_Batches" 
          ${whereClause}
          ORDER BY ${validatedSortBy} ${validatedSortOrder.toUpperCase()}
          LIMIT $${++paramCount} OFFSET $${++paramCount}
        `;
      }
      
      const countQuery = `
        SELECT COUNT(*) as total 
        FROM "KK_Survey_Batches" kb
        ${whereClause}
      `;

      console.log('🔍 Backend Service - Count query:', countQuery);
      console.log('🔍 Backend Service - Data query:', dataQuery);
      console.log('🔍 Backend Service - Include stats:', processedIncludeStats);
      console.log('🔍 Backend Service - Query params:', queryParams);

      queryParams.push(validatedPageSize, (validatedPage - 1) * validatedPageSize);

      // Execute queries
      const [countResult, dataResult] = await Promise.all([
        client.query(countQuery, queryParams.slice(0, -2)), // Remove LIMIT and OFFSET params for count
        client.query(dataQuery, queryParams)
      ]);

      const total = parseInt(countResult.rows[0].total);

      // Debug: Log the data being returned
      console.log('🔍 Backend Service - Data Result:', {
        totalRows: dataResult.rows.length,
        firstRow: dataResult.rows[0] ? {
          batch_id: dataResult.rows[0].batch_id,
          batch_name: dataResult.rows[0].batch_name,
          status: dataResult.rows[0].status,
          total_responses: dataResult.rows[0].total_responses,
          validated_responses: dataResult.rows[0].validated_responses,
          pending_responses: dataResult.rows[0].pending_responses,
          rejected_responses: dataResult.rows[0].rejected_responses,
          total_youths: dataResult.rows[0].total_youths
        } : 'No data',
        allRows: dataResult.rows
      });
      
      // Debug: Check if statistics fields exist in the first row
      if (dataResult.rows[0]) {
        const firstRow = dataResult.rows[0];
        console.log('🔍 Backend Service - Statistics Check:', {
          hasTotalResponses: 'total_responses' in firstRow,
          hasValidatedResponses: 'validated_responses' in firstRow,
          hasPendingResponses: 'pending_responses' in firstRow,
          hasRejectedResponses: 'rejected_responses' in firstRow,
          hasTotalYouths: 'total_youths' in firstRow,
          totalResponsesValue: firstRow.total_responses,
          validatedResponsesValue: firstRow.validated_responses,
          pendingResponsesValue: firstRow.pending_responses,
          rejectedResponsesValue: firstRow.rejected_responses,
          totalYouthsValue: firstRow.total_youths
        });
      }

      return {
        data: dataResult.rows,
        total,
        page: validatedPage,
        pageSize: validatedPageSize,
        totalPages: Math.ceil(total / validatedPageSize)
      };

    } catch (error) {
      logger.error('Error getting survey batches:', error);
      throw new Error('Failed to retrieve survey batches');
    } finally {
      client.release();
    }
  }

  /**
   * Get a single survey batch by ID
   * @param {string} batchId - Batch ID
   * @param {boolean} includeStats - Include calculated statistics
   * @returns {Promise<Object|null>} Batch data or null if not found
   */
  static async getBatchById(batchId, includeStats = false) {
    const client = await getClient();
    
    try {
      let query;
      if (includeStats) {
        // For statistics, we need to query all batches (not just active ones)
        // Use a custom query that includes statistics for any batch status
        query = `
          SELECT 
            kb.*,
            stats.total_responses,
            stats.validated_responses,
            stats.rejected_responses,
            stats.pending_responses,
            stats.total_youths,
            stats.total_youths_surveyed,
            stats.total_youths_not_surveyed,
            stats.response_rate,
            stats.validation_rate,
            CASE 
              WHEN kb.status = 'active' THEN (kb.end_date - CURRENT_DATE)
              ELSE NULL
            END as days_remaining,
            CASE 
              WHEN kb.status = 'active' AND CURRENT_DATE > kb.end_date THEN true
              ELSE false
            END as is_overdue
          FROM "KK_Survey_Batches" kb
          LEFT JOIN LATERAL calculate_batch_statistics(kb.batch_id) stats ON true
          WHERE kb.batch_id = $1
        `;
      } else {
        query = 'SELECT * FROM "KK_Survey_Batches" WHERE batch_id = $1';
      }

      const result = await client.query(query, [batchId]);
      return result.rows[0] || null;

    } catch (error) {
      logger.error('Error getting survey batch by ID:', error);
      throw new Error('Failed to retrieve survey batch');
    } finally {
      client.release();
    }
  }

  /**
   * Get responses for a specific survey batch
   * @param {string} batchId - Batch ID
   * @param {Object} options - Query options
   * @param {number} options.page - Page number
   * @param {number} options.limit - Items per page
   * @param {string} options.search - Search query
   * @param {string} options.status - Status filter
   * @returns {Promise<Object>} Responses data with pagination
   */
  static async getBatchResponses(batchId, options = {}) {
    const client = await getClient();
    
    try {
      console.log('🔍 Backend Service - getBatchResponses called with batchId:', batchId, 'options:', options);
      
      const {
        page = 1,
        limit = 10,
        search,
        status
      } = options;

      // Build the base query with joins to get youth profile data
      let query = `
        SELECT 
          ksr.response_id,
          ksr.batch_id,
          ksr.youth_id,
          ksr.barangay_id,
          ksr.civil_status,
          ksr.youth_classification,
          ksr.youth_specific_needs,
          ksr.youth_age_group,
          ksr.educational_background,
          ksr.work_status,
          ksr.registered_SK_voter,
          ksr.registered_national_voter,
          ksr.attended_KK_assembly AS attended_kk_assembly,
          ksr.voted_last_SK AS voted_last_sk,
          ksr.times_attended,
          ksr.reason_not_attended,
          ksr.validation_status,
          ksr.created_at,
          ksr.updated_at,
          -- Youth profile data
          yp.first_name,
          yp.last_name,
          yp.middle_name,
          yp.birth_date,
          yp.age,
          yp.gender,
          yp.email,
          yp.contact_number,
          yp.municipality,
          yp.province,
          yp.region,
          -- Barangay data
          b.barangay_name
        FROM "KK_Survey_Responses" ksr
        LEFT JOIN "Youth_Profiling" yp ON ksr.youth_id = yp.youth_id
        LEFT JOIN "Barangay" b ON ksr.barangay_id = b.barangay_id
        WHERE ksr.batch_id = $1
      `;

      const queryParams = [batchId];
      let paramCount = 1;

      // Add search filter
      if (search) {
        paramCount++;
        query += ` AND (
          yp.first_name ILIKE $${paramCount} OR 
          yp.last_name ILIKE $${paramCount} OR 
          yp.email ILIKE $${paramCount} OR
          b.barangay_name ILIKE $${paramCount}
        )`;
        queryParams.push(`%${search}%`);
      }

      // Add status filter
      if (status) {
        paramCount++;
        query += ` AND ksr.validation_status = $${paramCount}`;
        queryParams.push(status);
      }

      // Add ordering
      query += ` ORDER BY ksr.created_at DESC`;

      // Add pagination
      const offset = (page - 1) * limit;
      paramCount++;
      query += ` LIMIT $${paramCount}`;
      queryParams.push(limit);
      
      paramCount++;
      query += ` OFFSET $${paramCount}`;
      queryParams.push(offset);

      console.log('🔍 Backend Service - Executing query:', query);
      console.log('🔍 Backend Service - Query params:', queryParams);
      
      const result = await client.query(query, queryParams);
      console.log('🔍 Backend Service - Query result rows:', result.rows.length);
      console.log('🔍 Backend Service - First few rows:', result.rows.slice(0, 2));
      console.log('🔍 Backend Service - Municipality values:', result.rows.slice(0, 5).map(row => ({
        youth_id: row.youth_id,
        municipality: row.municipality,
        province: row.province,
        region: row.region,
        barangay_name: row.barangay_name
      })));

      // Get total count for pagination
      let countQuery = `
        SELECT COUNT(*) as total
        FROM "KK_Survey_Responses" ksr
        LEFT JOIN "Youth_Profiling" yp ON ksr.youth_id = yp.youth_id
        LEFT JOIN "Barangay" b ON ksr.barangay_id = b.barangay_id
        WHERE ksr.batch_id = $1
      `;
      
      const countParams = [batchId];
      let countParamCount = 1;

      if (search) {
        countParamCount++;
        countQuery += ` AND (
          yp.first_name ILIKE $${countParamCount} OR 
          yp.last_name ILIKE $${countParamCount} OR 
          yp.email ILIKE $${countParamCount} OR
          b.barangay_name ILIKE $${countParamCount}
        )`;
        countParams.push(`%${search}%`);
      }

      if (status) {
        countParamCount++;
        countQuery += ` AND ksr.validation_status = $${countParamCount}`;
        countParams.push(status);
      }

      const countResult = await client.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].total);
      console.log('🔍 Backend Service - Count query result:', total);

      // Transform the data to match frontend expectations
      const responses = result.rows.map(row => ({
        responseId: row.response_id,
        batchId: row.batch_id,
        youthId: row.youth_id,
        barangayId: row.barangay_id,
        region: row.region || 'Region IV-A (CALABARZON)',
        province: row.province || 'Batangas',
        cityMunicipality: row.municipality || 'San Jose',
        barangay: row.barangay_name,
        youthName: `${row.first_name || ''} ${row.middle_name || ''} ${row.last_name || ''}`.trim(),
        age: row.age,
        birthDate: row.birth_date,
        sexAtBirth: row.gender,
        civilStatus: row.civil_status,
        youthClassification: row.youth_classification,
        ageGroup: row.youth_age_group,
        email: row.email,
        contactNumber: row.contact_number,
        homeAddress: '', // Not available in Youth_Profiling table
        highestEducationalAttainment: row.educational_background,
        workStatus: row.work_status,
        registeredVoter: row.registered_sk_voter,
        votedLastElection: row.voted_last_sk,
        attendedKKAssembly: row.attended_kk_assembly,
        kkAssemblyAttendanceCount: row.times_attended,
        validationStatus: row.validation_status,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));

      const result_data = {
        data: responses,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
      
      console.log('🔍 Backend Service - Returning data:', {
        responsesCount: responses.length,
        total,
        pagination: result_data.pagination
      });
      
      return result_data;

    } catch (error) {
      logger.error('Error getting batch responses:', error);
      throw new Error('Failed to retrieve batch responses');
    } finally {
      client.release();
    }
  }

  /**
   * Update a survey batch
   * @param {string} batchId - Batch ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated batch
   */
  static async updateBatch(batchId, updateData) {
    const client = await getClient();
    
    try {
      await client.query('BEGIN');

      // Get current batch
      const currentBatch = await this.getBatchById(batchId);
      if (!currentBatch) {
        throw new Error('Survey batch not found');
      }

      // Validate the update data
      const validation = await this.validateBatchData(
        { ...currentBatch, ...updateData }, 
        true, 
        batchId
      );
      
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      // Additional rule: Extending a closed batch into an active window cannot
      // overlap with an already-active batch (global exclusivity)
      if (currentBatch.status === 'closed' && Object.prototype.hasOwnProperty.call(updateData, 'end_date')) {
        const proposedEnd = new Date(updateData.end_date);
        const startDate = new Date(currentBatch.start_date);
        const today = new Date();
        today.setHours(0,0,0,0);
        if (proposedEnd < startDate) {
          throw new Error('End date must be after start date');
        }
        // Would this extension make the batch active today?
        const wouldBeActiveToday = today >= startDate && today <= proposedEnd;
        if (wouldBeActiveToday) {
          const activeAny = await this.checkAnyActiveBatch(batchId);
          if (activeAny.hasActive) {
            const activeNames = activeAny.activeBatches.map(b => b.batch_name).join(', ');
            throw new Error(`Cannot extend: another survey batch is currently active (${activeNames}). Close it first or choose a different end date.`);
          }
          // If extending a closed batch makes it active today, automatically change status to active
          updateData.status = 'active';
        }
      }

      // Build update query dynamically
      const updateFields = [];
      const values = [];
      let paramCount = 0;

      const allowedFields = [
        'batch_name', 'description', 'start_date', 'end_date', 
        'target_age_min', 'target_age_max', 'status'
      ];

      allowedFields.forEach(field => {
        if (updateData.hasOwnProperty(field)) {
          updateFields.push(`${field} = $${++paramCount}`);
          values.push(updateData[field]);
        }
      });

      if (updateFields.length === 0) {
        throw new Error('No valid fields to update');
      }

      // Add updated_at
      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(batchId);

      const query = `
        UPDATE "KK_Survey_Batches" 
        SET ${updateFields.join(', ')}
        WHERE batch_id = $${++paramCount}
        RETURNING *
      `;

      const result = await client.query(query, values);
      await client.query('COMMIT');

      logger.info(`Survey batch updated: ${batchId}`);
      return result.rows[0];

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error updating survey batch:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // =============================================================================
  // STATUS MANAGEMENT
  // =============================================================================

  /**
   * Update batch status with audit trail
   * @param {string} batchId - Batch ID
   * @param {string} newStatus - New status
   * @param {string} userId - User performing the action
   * @param {Object} options - Additional options (reason, etc.)
   * @returns {Promise<Object>} Updated batch
   */
  static async updateBatchStatus(batchId, newStatus, userId, options = {}) {
    const client = await getClient();
    
    try {
      await client.query('BEGIN');

      // Get current batch
      const currentBatch = await this.getBatchById(batchId);
      if (!currentBatch) {
        throw new Error('Survey batch not found');
      }

      // Validate status transition
      await this.validateStatusTransition(currentBatch, newStatus, options);

      // Prepare update query based on status change
      let query, values;

      // Force-activate: set status active and align start_date to today if it is in the future
      if (newStatus === 'active' && options.isForce) {
        query = `
          UPDATE "KK_Survey_Batches"
          SET status = $1,
              start_date = CASE WHEN start_date > CURRENT_DATE THEN CURRENT_DATE ELSE start_date END,
              updated_at = CURRENT_TIMESTAMP
          WHERE batch_id = $2
          RETURNING *
        `;
        values = [newStatus, batchId];
      } else if (newStatus === 'active' && currentBatch.paused_at) {
        // This is a resume action
      
        // This is a resume action
        query = `
          UPDATE "KK_Survey_Batches" 
          SET status = $1, resumed_at = CURRENT_TIMESTAMP, resumed_by = $2,
              paused_at = NULL, paused_reason = NULL, updated_at = CURRENT_TIMESTAMP
          WHERE batch_id = $3
          RETURNING *
        `;
        values = [newStatus, userId, batchId];
      } else if (options.reason && (newStatus === 'active' || options.isPause)) {
        // This is a pause action or force action with reason
        query = `
          UPDATE "KK_Survey_Batches" 
          SET status = $1, paused_at = CURRENT_TIMESTAMP, paused_by = $2, 
              paused_reason = $3, updated_at = CURRENT_TIMESTAMP
          WHERE batch_id = $4
          RETURNING *
        `;
        values = [newStatus, userId, options.reason, batchId];
      } else if (newStatus === 'closed') {
        // Closing: update end_date to today to reflect close date
        query = `
          UPDATE "KK_Survey_Batches"
          SET status = $1,
              end_date = CASE WHEN end_date < CURRENT_DATE THEN end_date ELSE CURRENT_DATE END,
              updated_at = CURRENT_TIMESTAMP
          WHERE batch_id = $2
          RETURNING *
        `;
        values = [newStatus, batchId];
      } else {
        // Regular status update
        query = `
          UPDATE "KK_Survey_Batches" 
          SET status = $1, updated_at = CURRENT_TIMESTAMP
          WHERE batch_id = $2
          RETURNING *
        `;
        values = [newStatus, batchId];
      }

      const result = await client.query(query, values);
      await client.query('COMMIT');

      logger.info(`Survey batch status updated: ${batchId} from ${currentBatch.status} to ${newStatus} by ${userId}`);
      return result.rows[0];

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error updating batch status:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Validate status transition rules
   * @param {Object} currentBatch - Current batch data
   * @param {string} newStatus - Proposed new status
   * @param {Object} options - Additional options
   */
  static async validateStatusTransition(currentBatch, newStatus, options = {}) {
    const currentStatus = currentBatch.status;

    // Skip validation for force actions
    if (options.isForce) {
      // Force actions bypass normal transition rules
      // Only check business rules that still apply
    } else {
      // Define valid transitions for normal actions
      const validTransitions = {
        'draft': ['active'],
        'active': ['closed', 'active'], // active to active is for pause/resume
        'closed': ['active'] // Only for extensions
      };

      if (!validTransitions[currentStatus]?.includes(newStatus)) {
        throw new Error(`Invalid status transition from ${currentStatus} to ${newStatus}`);
      }
    }

    // Global exclusivity: only one active survey batch at any time
    if (newStatus === 'active') {
      const activeAny = await this.checkAnyActiveBatch(currentBatch.batch_id);
      if (activeAny.hasActive) {
        const activeNames = activeAny.activeBatches.map(b => b.batch_name).join(', ');
        throw new Error(`Only one active survey batch is allowed at a time. Currently active: ${activeNames}`);
      }
    }

    // Require reason for certain actions
    if (options.isPause && !options.reason?.trim()) {
      throw new Error('Reason is required for pausing a survey batch');
    }
  }

  // =============================================================================
  // STATISTICS AND UTILITIES
  // =============================================================================

  /**
   * Calculate batch statistics
   * @param {string} batchId - Batch ID
   * @returns {Promise<Object>} Statistics
   */
  static async calculateBatchStatistics(batchId) {
    const client = await getClient();
    
    try {
      const result = await client.query('SELECT * FROM calculate_batch_statistics($1)', [batchId]);
      return result.rows[0] || {};
    } catch (error) {
      logger.error('Error calculating batch statistics:', error);
      throw new Error('Failed to calculate batch statistics');
    } finally {
      client.release();
    }
  }

  /**
   * Get dashboard statistics
   * @returns {Promise<Object>} Dashboard stats
   */
  static async getDashboardStats() {
    const client = await getClient();
    
    try {
      const query = `
        SELECT 
          COUNT(*) as total_batches,
          COUNT(*) FILTER (WHERE status = 'active') as active_batches,
          COUNT(*) FILTER (WHERE status = 'closed') as closed_batches,
          COUNT(*) FILTER (WHERE status = 'draft') as draft_batches
        FROM "KK_Survey_Batches"
      `;

      const result = await client.query(query);
      return result.rows[0];
    } catch (error) {
      logger.error('Error getting dashboard statistics:', error);
      throw new Error('Failed to get dashboard statistics');
    } finally {
      client.release();
    }
  }

  /**
   * Generate unique batch ID
   * @returns {Promise<string>} Generated batch ID
   */
  static async generateBatchId() {
    const client = await getClient();
    
    try {
      // Get the highest existing batch number
      const result = await client.query(`
        SELECT batch_id 
        FROM "KK_Survey_Batches" 
        WHERE batch_id ~ '^BAT[0-9]+$' 
        ORDER BY CAST(SUBSTRING(batch_id FROM 4) AS INTEGER) DESC 
        LIMIT 1
      `);

      let nextNumber = 1;
      if (result.rows.length > 0) {
        const lastId = result.rows[0].batch_id;
        const lastNumber = parseInt(lastId.substring(3));
        nextNumber = lastNumber + 1;
      }

      return `BAT${nextNumber.toString().padStart(3, '0')}`;
    } catch (error) {
      logger.error('Error generating batch ID:', error);
      throw new Error('Failed to generate batch ID');
    } finally {
      client.release();
    }
  }

  /**
   * Delete a survey batch (soft delete by marking as closed)
   * @param {string} batchId - Batch ID
   * @param {string} userId - User performing the deletion
   * @returns {Promise<boolean>} Success status
   */
  static async deleteBatch(batchId, userId) {
    const client = await getClient();
    
    try {
      await client.query('BEGIN');

      // Check if batch exists and can be deleted
      const batch = await this.getBatchById(batchId);
      if (!batch) {
        throw new Error('Survey batch not found');
      }

      if (batch.status === 'active') {
        throw new Error('Cannot delete an active survey batch. Please close it first.');
      }

      // For now, we'll actually delete it, but in production you might want soft delete
      const result = await client.query(
        'DELETE FROM "KK_Survey_Batches" WHERE batch_id = $1', 
        [batchId]
      );

      await client.query('COMMIT');

      logger.info(`Survey batch deleted: ${batchId} by ${userId}`);
      return result.rowCount > 0;

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error deleting survey batch:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Handle errors with consistent error format
   * @param {Error} error - Error object
   * @param {string} defaultMessage - Default error message
   * @returns {Object} Formatted error response
   */
  static handleError(error, defaultMessage) {
    logger.error('SurveyBatchesService Error:', error);

    // Handle database errors
    if (error.code === '23505') { // Unique violation
      return {
        success: false,
        error: 'A survey batch with this name already exists.',
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
    if (error.message.includes('Only one active KK survey')) {
      return {
        success: false,
        error: error.message,
        code: 'BUSINESS_RULE_VIOLATION'
      };
    }

    if (error.message.includes('Date conflicts')) {
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

export default SurveyBatchesService;



