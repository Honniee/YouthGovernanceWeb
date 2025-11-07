import api from './api.js';

/**
 * Survey Tracking Service
 * Handles API calls for tracking individual youth participation in survey batches
 */
class SurveyTrackingService {
  /**
   * Get youth who participated in a batch
   * @param {string} batchId - Batch ID
   * @param {Object} params - Query parameters (page, limit, barangay, search)
   * @returns {Promise<Object>} API response with participated youth
   */
  async getParticipatedYouth(batchId, params = {}) {
    try {
      const queryParams = new URLSearchParams();
      if (params.page) queryParams.append('page', params.page);
      if (params.limit) queryParams.append('limit', params.limit);
      if (params.barangay) queryParams.append('barangay', params.barangay);
      if (params.search) queryParams.append('search', params.search);

      const url = `/survey-tracking/${batchId}/participated?${queryParams.toString()}`;
      const response = await api.get(url);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error getting participated youth:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to load participated youth'
      };
    }
  }

  /**
   * Get youth who did NOT participate in a batch
   * @param {string} batchId - Batch ID
   * @param {Object} params - Query parameters (page, limit, barangay, search)
   * @returns {Promise<Object>} API response with not-participated youth
   */
  async getNotParticipatedYouth(batchId, params = {}) {
    try {
      const queryParams = new URLSearchParams();
      if (params.page) queryParams.append('page', params.page);
      if (params.limit) queryParams.append('limit', params.limit);
      if (params.barangay) queryParams.append('barangay', params.barangay);
      if (params.search) queryParams.append('search', params.search);

      const url = `/survey-tracking/${batchId}/not-participated?${queryParams.toString()}`;
      const response = await api.get(url);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error getting not-participated youth:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to load not-participated youth'
      };
    }
  }

  /**
   * Get barangay-level participation statistics
   * @param {string} batchId - Batch ID
   * @returns {Promise<Object>} API response with barangay stats
   */
  async getBarangayStats(batchId) {
    try {
      const response = await api.get(`/survey-tracking/${batchId}/barangay-stats`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error getting barangay stats:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to load barangay statistics'
      };
    }
  }

  /**
   * Get SK officials for a specific barangay
   * @param {string} barangayId - Barangay ID
   * @returns {Promise<Object>} API response with SK officials
   */
  async getSKOfficialsByBarangay(barangayId) {
    try {
      const response = await api.get(`/survey-tracking/sk-officials/${barangayId}`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error getting SK officials:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to load SK officials'
      };
    }
  }

  /**
   * Get all youth with their participation status across all batches
   * @param {Object} params - Query parameters (page, limit, barangay, search)
   * @returns {Promise<Object>} API response with youth participation data
   */
  async getYouthParticipation(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      if (params.page) queryParams.append('page', params.page);
      if (params.limit) queryParams.append('limit', params.limit);
      if (params.barangay) queryParams.append('barangay', params.barangay);
      if (params.search) queryParams.append('search', params.search);

      const url = `/survey-tracking/youth-participation?${queryParams.toString()}`;
      const response = await api.get(url);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error getting youth participation:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to load youth participation data'
      };
    }
  }

  /**
   * Get all youth grouped by barangay with current survey participation status
   * @returns {Promise<Object>} API response with barangay youth data
   */
  async getBarangayYouth() {
    try {
      const response = await api.get('/survey-tracking/barangay-youth');
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error getting barangay youth:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to load barangay youth data'
      };
    }
  }
}

const surveyTrackingService = new SurveyTrackingService();
export default surveyTrackingService;

