import api from './api.js';

/**
 * Survey Batches Management Service
 * Handles all API calls for Survey Batches operations
 */
class SurveyBatchesService {
  /**
   * Get all survey batches with pagination and filtering
   * @param {Object} params - Query parameters
   * @param {number} params.page - Page number
   * @param {number} params.limit - Items per page
   * @param {string} params.search - Search query
   * @param {string} params.status - Status filter (active/closed/draft)
   * @param {string} params.sortBy - Sort field
   * @param {string} params.sortOrder - Sort order (asc/desc)
   * @param {boolean} params.includeStats - Include calculated statistics
   * @param {string} customEndpoint - Custom endpoint path (e.g., '/active')
   * @returns {Promise<Object>} API response with survey batches and pagination
   */
  async getSurveyBatches(params = {}, customEndpoint = '') {
    try {
      console.log('🔍 Service - getSurveyBatches called with params:', params);
      
      const queryParams = new URLSearchParams();
      
      if (params.page) queryParams.append('page', params.page);
      if (params.limit) queryParams.append('limit', params.limit);
      if (params.search) queryParams.append('search', params.search);
      if (params.status) queryParams.append('status', params.status);
      if (params.sortBy) queryParams.append('sortBy', params.sortBy);
      if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);
      if (params.includeStats) queryParams.append('includeStats', params.includeStats);
      if (params.dateCreated) queryParams.append('dateCreated', params.dateCreated);

      const url = `/survey-batches${customEndpoint}?${queryParams.toString()}`;
      console.log('🔍 Service - Making API call to:', url);
      console.log('🔍 Service - Query params:', queryParams.toString());

      const response = await api.get(url);
      console.log('🔍 Service - API response:', response.data);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('🔍 Service - API error:', error);
      return this.handleError(error, 'Failed to load survey batches');
    }
  }

  /**
   * Get a single survey batch by ID
   * @param {string} batchId - Batch ID
   * @param {boolean} includeStats - Include calculated statistics
   * @returns {Promise<Object>} API response with batch data
   */
  async getSurveyBatchById(batchId, includeStats = false) {
    try {
      const queryParams = includeStats ? '?includeStats=true' : '';
      const response = await api.get(`/survey-batches/${batchId}${queryParams}`);
      return { success: true, data: response.data.data };
    } catch (error) {
      return this.handleError(error, 'Failed to load survey batch');
    }
  }

  /**
   * Get responses for a specific survey batch
   * @param {string} batchId - Batch ID
   * @param {Object} params - Query parameters
   * @param {number} params.page - Page number
   * @param {number} params.limit - Items per page
   * @param {string} params.status - Status filter
   * @returns {Promise<Object>} API response with batch responses
   */
  async getBatchResponses(batchId, params = {}) {
    try {
      console.log('🔍 Service - getBatchResponses called with batchId:', batchId, 'params:', params);
      
      const queryParams = new URLSearchParams();
      if (params.page) queryParams.append('page', params.page);
      if (params.limit) queryParams.append('limit', params.limit);
      if (params.status) queryParams.append('status', params.status);
      if (params.search) queryParams.append('search', params.search);
      if (params.barangay) queryParams.append('barangay', params.barangay);

      const qs = queryParams.toString();
      const url = qs
        ? `/survey-batches/${batchId}/responses?${qs}`
        : `/survey-batches/${batchId}/responses`;
      console.log('🔍 Service - Making API call to:', url);

      const response = await api.get(url);
      console.log('🔍 Service - API response:', response.data);
      return { success: true, data: response.data.data || response.data };
    } catch (error) {
      return this.handleError(error, 'Failed to load batch responses');
    }
  }

  /**
   * Create a new survey batch
   * @param {Object} batchData - Batch data
   * @param {string} batchData.batchName - Batch name
   * @param {string} batchData.description - Description
   * @param {string} batchData.startDate - Start date (YYYY-MM-DD)
   * @param {string} batchData.endDate - End date (YYYY-MM-DD)
   * @param {number} batchData.targetAgeMin - Minimum target age
   * @param {number} batchData.targetAgeMax - Maximum target age
   * @returns {Promise<Object>} API response with created batch
   */
  async createSurveyBatch(batchData) {
    try {
      console.log('🔍 Service - Creating batch with data:', batchData);
      const response = await api.post('/survey-batches', batchData);
      console.log('🔍 Service - Create batch success response:', response.data);
      return { success: true, data: response.data.data, message: response.data.message };
    } catch (error) {
      console.log('🔍 Service - Create batch error:', error);
      try {
        // Handle validation errors from the backend first
        if (error.message && error.message.includes('Validation failed')) {
          console.log('🔍 Service - Validation error detected');
          console.log('🔍 Service - Error data:', error.data);
          console.log('🔍 Service - Error errors:', error.errors);
          
          // Check if there are specific validation errors in the errors array
          let specificError = error.message;
          if (error.errors && error.errors.length > 0) {
            // Extract the first error message
            const firstError = error.errors[0];
            if (firstError.message) {
              specificError = firstError.message;
            } else if (typeof firstError === 'string') {
              specificError = firstError;
            }
          }
          
          return {
            success: false,
            message: specificError,
            error: specificError,
            status: 400
          };
        }
        
        // Handle custom error objects directly
        if (error.status && error.message) {
          console.log('🔍 Service - Custom error object detected');
          return {
            success: false,
            message: error.message,
            error: error.message,
            status: error.status,
            errors: error.errors || null
          };
        }
        
        const errorResult = this.handleError(error, 'Failed to create survey batch');
        console.log('🔍 Service - HandleError result:', errorResult);
        return errorResult;
      } catch (handleError) {
        console.error('🔍 Service - HandleError failed:', handleError);
        return {
          success: false,
          message: 'Failed to create survey batch',
          error: 'Service error occurred'
        };
      }
    }
  }

  /**
   * Update a survey batch
   * @param {string} batchId - Batch ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} API response with updated batch
   */
  async updateSurveyBatch(batchId, updateData) {
    try {
      const response = await api.put(`/survey-batches/${batchId}`, updateData);
      return { success: true, data: response.data.data, message: response.data.message };
    } catch (error) {
      return this.handleError(error, 'Failed to update survey batch');
    }
  }

  /**
   * Delete a survey batch
   * @param {string} batchId - Batch ID
   * @returns {Promise<Object>} API response
   */
  async deleteSurveyBatch(batchId) {
    try {
      const response = await api.delete(`/survey-batches/${batchId}`);
      return { success: true, message: response.data.message };
    } catch (error) {
      return this.handleError(error, 'Failed to delete survey batch');
    }
  }

  /**
   * Get survey batch statistics (counts by status)
   * @returns {Promise<Object>} API response with batch statistics
   */
  async getBatchStats() {
    try {
      console.log('🔍 Service - getBatchStats called');
      
      const response = await api.get('/survey-batches/statistics/dashboard');
      console.log('🔍 Service - Stats API response:', response.data);
      
      return { success: true, data: response.data };
    } catch (error) {
      console.error('🔍 Service - Stats API error:', error);
      return this.handleError(error, 'Failed to load batch statistics');
    }
  }

  // =============================================================================
  // STATUS MANAGEMENT
  // =============================================================================

  /**
   * Update survey batch status
   * @param {string} batchId - Batch ID
   * @param {string} status - New status (active/closed/draft)
   * @param {string} action - Action type (activate/pause/resume/close/force-activate/force-close)
   * @param {string} reason - Reason for status change (required for pause and force actions)
   * @returns {Promise<Object>} API response with updated batch
   */
  async updateBatchStatus(batchId, status, action, reason = '') {
    try {
      const statusData = {
        status,
        action,
        ...(reason && { reason })
      };

      const response = await api.patch(`/survey-batches/${batchId}/status`, statusData);
      return { success: true, data: response.data.data, message: response.data.message };
    } catch (error) {
      return this.handleError(error, 'Failed to update survey batch status');
    }
  }

  /**
   * Pause a survey batch
   * @param {string} batchId - Batch ID
   * @param {string} reason - Reason for pausing
   * @returns {Promise<Object>} API response
   */
  async pauseBatch(batchId, reason) {
    return this.updateBatchStatus(batchId, 'active', 'pause', reason);
  }

  /**
   * Resume a survey batch
   * @param {string} batchId - Batch ID
   * @returns {Promise<Object>} API response
   */
  async resumeBatch(batchId) {
    return this.updateBatchStatus(batchId, 'active', 'resume');
  }

  /**
   * Activate a survey batch
   * @param {string} batchId - Batch ID
   * @returns {Promise<Object>} API response
   */
  async activateBatch(batchId) {
    return this.updateBatchStatus(batchId, 'active', 'activate');
  }

  /**
   * Close a survey batch
   * @param {string} batchId - Batch ID
   * @returns {Promise<Object>} API response
   */
  async closeBatch(batchId) {
    return this.updateBatchStatus(batchId, 'closed', 'close');
  }

  /**
   * Force activate a survey batch
   * @param {string} batchId - Batch ID
   * @param {string} reason - Reason for force activation
   * @returns {Promise<Object>} API response
   */
  async forceActivateBatch(batchId, reason) {
    return this.updateBatchStatus(batchId, 'active', 'force-activate', reason);
  }

  /**
   * Force close a survey batch
   * @param {string} batchId - Batch ID
   * @param {string} reason - Reason for force closure
   * @returns {Promise<Object>} API response
   */
  async forceCloseBatch(batchId, reason) {
    return this.updateBatchStatus(batchId, 'closed', 'force-close', reason);
  }

  // =============================================================================
  // STATISTICS AND UTILITIES
  // =============================================================================

  /**
   * Get detailed statistics for a specific batch
   * @param {string} batchId - Batch ID
   * @returns {Promise<Object>} API response with statistics
   */
  async getBatchStatistics(batchId) {
    try {
      const response = await api.get(`/survey-batches/${batchId}/statistics`);
      return { success: true, data: response.data.data };
    } catch (error) {
      return this.handleError(error, 'Failed to load batch statistics');
    }
  }

  /**
   * Get dashboard statistics for all batches
   * @returns {Promise<Object>} API response with dashboard stats
   */
  async getDashboardStatistics() {
    try {
      const response = await api.get('/survey-batches/statistics/dashboard');
      return { success: true, data: response.data.data };
    } catch (error) {
      return this.handleError(error, 'Failed to load dashboard statistics');
    }
  }

  /**
   * Get batches that need automatic status updates
   * @returns {Promise<Object>} API response with batches needing updates
   */
  async getBatchesNeedingUpdate() {
    try {
      const response = await api.get('/survey-batches/utilities/auto-update');
      return { success: true, data: response.data.data };
    } catch (error) {
      return this.handleError(error, 'Failed to check for batch updates');
    }
  }

  /**
   * Check business rules (active KK survey, date conflicts)
   * @param {Object} params - Check parameters
   * @param {string} params.startDate - Start date to check
   * @param {string} params.endDate - End date to check
   * @param {string} params.excludeBatchId - Batch ID to exclude from checks
   * @returns {Promise<Object>} API response with business rule results
   */
  async checkBusinessRules(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      if (params.startDate) queryParams.append('startDate', params.startDate);
      if (params.endDate) queryParams.append('endDate', params.endDate);
      if (params.excludeBatchId) queryParams.append('excludeBatchId', params.excludeBatchId);

      const response = await api.get(`/survey-batches/utilities/business-rules?${queryParams.toString()}`);
      return { success: true, data: response.data.data };
    } catch (error) {
      return this.handleError(error, 'Failed to check business rules');
    }
  }

  // =============================================================================
  // BULK OPERATIONS
  // =============================================================================

  /**
   * Bulk update batch statuses
   * @param {Array} batchIds - Array of batch IDs
   * @param {string} status - New status
   * @param {string} reason - Reason for bulk update
   * @returns {Promise<Object>} API response with bulk operation results
   */
  async bulkUpdateStatus(batchIds, status, reason = '') {
    try {
      const bulkData = {
        batchIds,
        status,
        ...(reason && { reason })
      };

      const response = await api.post('/survey-batches/bulk/status', bulkData);
      return { success: true, data: response.data.data, message: response.data.message };
    } catch (error) {
      return this.handleError(error, 'Failed to perform bulk status update');
    }
  }

  // =============================================================================
  // CLIENT-SIDE AUTO-UPDATE LOGIC
  // =============================================================================

  /**
   * Check and perform automatic status updates for batches
   * @returns {Promise<Object>} Results of auto-update check
   */
  async performAutoStatusUpdate() {
    try {
      // Get batches that need status updates
      const batchesResult = await this.getBatchesNeedingUpdate();
      
      if (!batchesResult.success) {
        return { success: false, error: 'Failed to check for updates' };
      }

      const batchesToUpdate = batchesResult.data;
      
      if (batchesToUpdate.length === 0) {
        return { success: true, updates: [], message: 'No batches need status updates' };
      }

      // For now, we'll just return the batches that need updates
      // In a real implementation, you might want to automatically update them
      // or show a notification to the user
      return {
        success: true,
        updates: batchesToUpdate,
        message: `${batchesToUpdate.length} batch(es) need status updates`
      };

    } catch (error) {
      return { success: false, error: 'Auto-update check failed' };
    }
  }

  // =============================================================================
  // ERROR HANDLING
  // =============================================================================

  /**
   * Handle API errors with consistent error format
   * @param {Error} error - Error object
   * @param {string} defaultMessage - Default error message
   * @returns {Object} Formatted error response
   */
  handleError(error, defaultMessage) {
    console.error('SurveyBatchesService Error:', error);

    // Our axios interceptor rejects with a plain object: { status, message, errors, data }
    if (error && typeof error === 'object' && 'status' in error && !error.response) {
      const status = error.status;
      const data = error.data || {};
      const message = error.message || data.message || defaultMessage;

      switch (status) {
        case 400:
          return { success: false, error: message || 'Invalid request data', validationErrors: data.errors || null };
        case 401:
          return { success: false, error: 'Authentication required. Please log in.', requiresAuth: true };
        case 403:
          return { success: false, error: 'Access denied. Admin privileges required.', requiresRole: 'admin' };
        case 404:
          return { success: false, error: 'Survey batch not found.', notFound: true };
        case 409:
          return { success: false, error: message || 'Conflict with existing data', conflicts: data.conflicts || null };
        case 429:
          return { success: false, error: 'Too many requests. Please try again later.', rateLimited: true };
        default:
          return { success: false, error: message || defaultMessage };
      }
    }

    // Native axios error with response
    if (error.response) {
      const { status, data } = error.response;
      switch (status) {
        case 400:
          return { success: false, error: data.message || 'Invalid request data', validationErrors: data.errors || null };
        case 401:
          return { success: false, error: 'Authentication required. Please log in.', requiresAuth: true };
        case 403:
          return { success: false, error: 'Access denied. Admin privileges required.', requiresRole: 'admin' };
        case 404:
          return { success: false, error: 'Survey batch not found.', notFound: true };
        case 409:
          return { success: false, error: data.message || 'Conflict with existing data', conflicts: data.conflicts || null };
        case 429:
          return { success: false, error: 'Too many requests. Please try again later.', rateLimited: true };
        default:
          return { success: false, error: data.message || defaultMessage };
      }
    }

    // Fallback network/unknown error
    return { success: false, error: error?.message || defaultMessage };
  }

  // =============================================================================
  // EXPORT OPERATIONS
  // =============================================================================

  /**
   * Log export activity (for activity logs)
   * Since exports are done client-side, this endpoint just logs the activity
   * @param {Object} params - Export parameters
   * @param {string} params.format - Export format (csv, excel, pdf)
   * @param {Array} params.selectedIds - Selected batch IDs (for bulk export)
   * @param {number} params.count - Number of items exported
   * @param {string} params.status - Status filter applied
   * @returns {Promise<Object>} API response
   */
  async logExport(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      if (params.format) queryParams.append('format', params.format === 'xlsx' ? 'excel' : params.format);
      if (params.logFormat) queryParams.append('logFormat', params.logFormat);
      if (params.selectedIds && params.selectedIds.length > 0) {
        queryParams.append('selectedIds', params.selectedIds.join(','));
      }
      if (params.count) queryParams.append('count', params.count);
      if (params.status) queryParams.append('status', params.status);

      const response = await api.get(`/survey-batches/export?${queryParams.toString()}`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error logging export:', error);
      // Don't fail the export if logging fails
      return { success: false, error: 'Export logging failed' };
    }
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  /**
   * Format date for API requests
   * @param {Date|string} date - Date to format
   * @returns {string} Formatted date string (YYYY-MM-DD)
   */
  formatDateForAPI(date) {
    if (!date) return '';
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  }

  /**
   * Check if a survey name is a KK survey type
   * @param {string} name - Survey name
   * @returns {boolean}
   */
  isKKSurveyName(name) {
    if (!name) return false;
    const lowerName = name.toLowerCase();
    return lowerName.includes('katipunan ng kabataan') || 
           lowerName.includes('kk survey') ||
           lowerName.includes('kk ');
  }

  /**
   * Validate batch data before sending to API
   * @param {Object} batchData - Batch data to validate
   * @returns {Object} Validation result
   */
  validateBatchData(batchData) {
    const errors = [];

    if (!batchData.batchName?.trim()) {
      errors.push('Batch name is required');
    }

    if (!batchData.startDate) {
      errors.push('Start date is required');
    }

    if (!batchData.endDate) {
      errors.push('End date is required');
    }

    if (batchData.startDate && batchData.endDate) {
      const startDate = new Date(batchData.startDate);
      const endDate = new Date(batchData.endDate);
      
      if (endDate <= startDate) {
        errors.push('End date must be after start date');
      }
    }

    if (batchData.targetAgeMin && batchData.targetAgeMax) {
      if (batchData.targetAgeMax <= batchData.targetAgeMin) {
        errors.push('Maximum age must be greater than minimum age');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Handle API errors with consistent error format
   * @param {Error} error - Error object
   * @param {string} defaultMessage - Default error message
   * @returns {Object} Formatted error response
   */
  handleError(error, defaultMessage) {
    console.error('SurveyBatchesService Error:', error);

    // Interceptor-shaped error
    if (error && typeof error === 'object' && 'status' in error && !error.response) {
      const status = error.status;
      const data = error.data || {};
      const message = error.message || data.message || defaultMessage;
      switch (status) {
        case 400:
          return { success: false, error: message || 'Invalid request data', validationErrors: data.errors || null };
        case 401:
          return { success: false, error: 'Authentication required. Please log in.', requiresAuth: true };
        case 403:
          return { success: false, error: 'Access denied. Admin privileges required.', requiresRole: 'admin' };
        case 404:
          return { success: false, error: 'Survey batch not found.', notFound: true };
        case 409:
          return { success: false, error: message || 'Conflict with existing data', conflicts: data.conflicts || null };
        case 429:
          return { success: false, error: 'Too many requests. Please try again later.', rateLimited: true };
        default:
          return { success: false, error: message || defaultMessage };
      }
    }

    if (error.response) {
      const { status, data } = error.response;
      switch (status) {
        case 400:
          return { success: false, error: data.message || 'Invalid request data', validationErrors: data.errors || null };
        case 401:
          return { success: false, error: 'Authentication required. Please log in.', requiresAuth: true };
        case 403:
          return { success: false, error: 'Access denied. Admin privileges required.', requiresRole: 'admin' };
        case 404:
          return { success: false, error: 'Survey batch not found.', notFound: true };
        case 409:
          return { success: false, error: data.message || 'Conflict with existing data', conflicts: data.conflicts || null };
        case 429:
          return { success: false, error: 'Too many requests. Please try again later.', rateLimited: true };
        default:
          return { success: false, error: data.message || defaultMessage };
      }
    }

    return { success: false, error: error?.message || defaultMessage };
  }
}

// Create and export singleton instance
const surveyBatchesService = new SurveyBatchesService();
export default surveyBatchesService;



