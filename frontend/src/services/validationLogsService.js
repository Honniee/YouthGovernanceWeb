import api from './api.js';
import logger from '../utils/logger.js';

/**
 * Validation Logs Service
 * Handles API calls for validation logs
 */

const validationLogsService = {
  /**
   * Get validation logs with filtering and pagination
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Response with data and pagination
   */
  async getValidationLogs(params = {}) {
    try {
      const response = await api.get('/validation-logs', { params });
      return response.data;
    } catch (error) {
      logger.error('Error fetching validation logs', error, { params });
      throw error;
    }
  }
};

export default validationLogsService;

