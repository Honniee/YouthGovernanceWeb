import api from './api';

/**
 * Clustering Service
 * API client for youth clustering endpoints
 */

const clusteringService = {
  /**
   * Run clustering manually
   * @param {Object} options - Clustering options
   * @param {string} options.scope - 'municipality' or 'barangay'
   * @param {string} [options.barangayId] - Barangay ID (for barangay scope)
   * @param {string} [options.batchId] - Batch ID (for batch-specific clustering)
   * @returns {Promise<Object>} Clustering result
   */
  runClustering: async (options = {}) => {
    try {
      const response = await api.post('/clustering/run', options);
      return response.data;
    } catch (error) {
      console.error('Error running clustering:', error);
      throw error.response?.data || error;
    }
  },

  /**
   * Get all active segments
   * @param {Object} filters - Filter options
   * @param {string} [filters.scope] - 'municipality' or 'barangay'
   * @param {string} [filters.barangayId] - Filter by barangay
   * @param {string} [filters.batchId] - Filter by batch
   * @returns {Promise<Array>} List of segments
   */
  getSegments: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      if (filters.scope) params.append('scope', filters.scope);
      if (filters.barangayId) params.append('barangayId', filters.barangayId);
      if (filters.batchId) params.append('batchId', filters.batchId);

      const response = await api.get(`/clustering/segments?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching segments:', error);
      throw error.response?.data || error;
    }
  },

  /**
   * Get segment by ID
   * @param {string} segmentId - Segment ID
   * @returns {Promise<Object>} Segment details
   */
  getSegmentById: async (segmentId) => {
    try {
      const response = await api.get(`/clustering/segments/${segmentId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching segment:', error);
      throw error.response?.data || error;
    }
  },

  /**
   * Get clustering run history
   * @param {Object} filters - Filter options
   * @param {number} [filters.limit] - Limit results
   * @param {string} [filters.scope] - Filter by scope
   * @param {string} [filters.batchId] - Filter by batch
   * @returns {Promise<Array>} List of clustering runs
   */
  getClusteringRuns: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      if (filters.limit) params.append('limit', filters.limit);
      if (filters.scope) params.append('scope', filters.scope);
      if (filters.batchId) params.append('batchId', filters.batchId);

      const response = await api.get(`/clustering/runs?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching clustering runs:', error);
      throw error.response?.data || error;
    }
  },

  /**
   * Get clustering statistics
   * @param {Object} filters - Filter options
   * @param {string} [filters.scope] - Filter by scope
   * @param {string} [filters.barangayId] - Filter by barangay
   * @param {string} [filters.batchId] - Filter by batch
   * @returns {Promise<Object>} Clustering statistics
   */
  getClusteringStats: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      if (filters.scope) params.append('scope', filters.scope);
      if (filters.barangayId) params.append('barangayId', filters.barangayId);
      if (filters.batchId) params.append('batchId', filters.batchId);

      const response = await api.get(`/clustering/stats?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching clustering stats:', error);
      throw error.response?.data || error;
    }
  },

  /**
   * Get program recommendations
   * @param {Object} filters - Filter options
   * @param {string} [filters.segmentId] - Filter by segment
   * @param {string} [filters.batchId] - Filter by batch
   * @returns {Promise<Array>} List of recommendations
   */
  getRecommendations: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      if (filters.segmentId) params.append('segmentId', filters.segmentId);
      if (filters.batchId) params.append('batchId', filters.batchId);

      const response = await api.get(`/clustering/recommendations?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      throw error.response?.data || error;
    }
  },

  /**
   * Get youth assignments for a segment
   * @param {string} segmentId - Segment ID
   * @returns {Promise<Array>} List of youth in segment
   */
  getSegmentYouth: async (segmentId) => {
    try {
      const response = await api.get(`/clustering/segments/${segmentId}/youth`);
      return response.data;
    } catch (error) {
      console.error('Error fetching segment youth:', error);
      throw error.response?.data || error;
    }
  }
};

export default clusteringService;

