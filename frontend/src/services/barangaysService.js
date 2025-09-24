import api from './api.js';

const barangaysService = {
  /**
   * Get all barangays with youth statistics
   * @param {Object} params - Query parameters
   * @param {string} params.sortBy - Sort by field (barangay_name|youth_count|created_at)
   * @param {string} params.sortOrder - Sort order (asc|desc)
   * @param {string} params.search - Search term
   * @returns {Promise<Object>} API response
   */
  async getBarangays(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      if (params.sortBy) queryParams.append('sortBy', params.sortBy);
      if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);
      if (params.search) queryParams.append('search', params.search);
      
      const response = await api.get(`/barangays?${queryParams.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching barangays:', error);
      throw error;
    }
  },

  /**
   * Get barangay by ID with detailed information
   * @param {string} id - Barangay ID
   * @returns {Promise<Object>} API response
   */
  async getBarangayById(id) {
    try {
      if (!id) {
        throw new Error('Barangay ID is required');
      }
      
      const response = await api.get(`/barangays/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching barangay details:', error);
      throw error;
    }
  },

  /**
   * Get barangay statistics summary
   * @returns {Promise<Object>} API response
   */
  async getBarangayStatistics() {
    try {
      const response = await api.get('/barangays/statistics');
      return response.data;
    } catch (error) {
      console.error('Error fetching barangay statistics:', error);
      throw error;
    }
  },

  /**
   * Get youth list for a specific barangay
   * @param {string} id - Barangay ID
   * @param {Object} params - Query parameters
   * @param {number} params.page - Page number (default: 1)
   * @param {number} params.limit - Items per page (default: 50, max: 100)
   * @param {boolean} params.activeOnly - Show only active youth (default: true)
   * @param {string} params.sortBy - Sort by field (last_name|first_name|age|created_at)
   * @param {string} params.sortOrder - Sort order (asc|desc)
   * @returns {Promise<Object>} API response
   */
  async getBarangayYouth(id, params = {}) {
    try {
      if (!id) {
        throw new Error('Barangay ID is required');
      }
      
      const queryParams = new URLSearchParams();
      
      if (params.page) queryParams.append('page', params.page);
      if (params.limit) queryParams.append('limit', params.limit);
      if (params.activeOnly !== undefined) queryParams.append('activeOnly', params.activeOnly);
      if (params.sortBy) queryParams.append('sortBy', params.sortBy);
      if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);
      
      const response = await api.get(`/barangays/${id}/youth?${queryParams.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching barangay youth:', error);
      throw error;
    }
  }
};

export default barangaysService;
