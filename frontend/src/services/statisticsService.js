import api from './api.js';
import logger from '../utils/logger.js';

/**
 * Statistics Service
 * Handles API calls for statistics data
 */
class StatisticsService {
  /**
   * Get home page statistics (public endpoint)
   * @returns {Promise<Object>} API response with home page statistics
   */
  async getHomePageStatistics() {
    try {
      logger.debug('Fetching home page statistics');
      const response = await api.get('/statistics/home');
      logger.debug('Home page statistics received', { dataKeys: Object.keys(response.data?.data || {}) });
      return { success: true, data: response.data.data };
    } catch (error) {
      logger.error('Error fetching home page statistics', error);
      return this.handleError(error, 'Failed to load home page statistics');
    }
  }

  /**
   * Get admin dashboard statistics (authenticated endpoint)
   * @returns {Promise<Object>} API response with admin dashboard statistics
   */
  async getAdminDashboardStatistics() {
    try {
      logger.debug('Fetching admin dashboard statistics');
      const response = await api.get('/statistics/admin/dashboard');
      logger.debug('Admin dashboard statistics received', { dataKeys: Object.keys(response.data?.data || {}) });
      return { success: true, data: response.data.data };
    } catch (error) {
      logger.error('Error fetching admin dashboard statistics', error);
      return this.handleError(error, 'Failed to load admin dashboard statistics');
    }
  }

  /**
   * Handle API errors
   * @param {Error} error - The error object
   * @param {string} defaultMessage - Default error message
   * @returns {Object} Error response object
   */
  handleError(error, defaultMessage = 'An error occurred') {
    const errorResponse = {
      success: false,
      message: defaultMessage,
      error: null
    };

    if (error.response) {
      // Server responded with error status
      errorResponse.message = error.response.data?.message || defaultMessage;
      errorResponse.error = error.response.data?.error || error.response.statusText;
    } else if (error.request) {
      // Request was made but no response received
      errorResponse.message = 'Network error - please check your connection';
      errorResponse.error = 'No response from server';
    } else {
      // Something else happened
      errorResponse.message = error.message || defaultMessage;
      errorResponse.error = error.message;
    }

    return errorResponse;
  }
}

// Create and export singleton instance
const statisticsService = new StatisticsService();
export default statisticsService;
